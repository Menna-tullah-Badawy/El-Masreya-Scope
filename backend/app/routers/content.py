"""التقييمات + المدونة + الإشعارات + المستخدمون + الإعدادات"""
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models import (
    Notification, Order, OrderStatus, Post, Product, Review, Setting, User, UserRole,
)
from ..schemas import (
    NotificationOut, PostIn, PostOut, ReviewIn, ReviewOut, UserOut,
)
from ..security import get_current_user, get_current_user_optional, require_admin
from ..serializers import notification_out, post_out, review_out, user_out

router = APIRouter(prefix="/api", tags=["content"])


# --------------------------------------------------------------- reviews
def _refresh_rating(db: Session, product_id: int):
    row = (db.query(func.avg(Review.rating), func.count(Review.id))
           .filter(Review.product_id == product_id, Review.is_approved.is_(True)).first())
    p = db.get(Product, product_id)
    if p:
        p.rating_avg = float(row[0] or 0)
        p.rating_count = int(row[1] or 0)


@router.get("/reviews", response_model=List[ReviewOut])
def list_reviews(db: Session = Depends(get_db), product_id: Optional[int] = None,
                 pending: bool = False, user: Optional[User] = Depends(get_current_user_optional)):
    q = db.query(Review)
    if product_id:
        q = q.filter(Review.product_id == product_id)
    is_admin = bool(user and user.role == UserRole.admin)
    if pending:
        if not is_admin:
            raise HTTPException(403, "للمدير فقط")
        q = q.filter(Review.is_approved.is_(False))
    elif not is_admin:
        q = q.filter(Review.is_approved.is_(True))
    return [review_out(r) for r in q.order_by(Review.id.desc()).limit(300).all()]


@router.post("/reviews", response_model=ReviewOut)
def create_review(payload: ReviewIn, db: Session = Depends(get_db),
                  user: User = Depends(get_current_user)):
    if not db.get(Product, payload.product_id):
        raise HTTPException(404, "المنتج غير موجود")
    existing = db.query(Review).filter(Review.product_id == payload.product_id,
                                       Review.user_id == user.id).first()
    if existing:
        existing.rating = payload.rating
        existing.comment = payload.comment
        existing.is_approved = False
        r = existing
    else:
        r = Review(product_id=payload.product_id, user_id=user.id,
                   rating=payload.rating, comment=payload.comment)
        db.add(r)
    db.add(Notification(for_admin=True, level="info",
                        title_ar="تقييم جديد بانتظار الاعتماد",
                        title_en="New review awaiting approval",
                        body_ar=f"{user.name} قيّم منتجاً بـ {payload.rating}/5",
                        body_en=f"{user.name} rated a product {payload.rating}/5",
                        link="/admin/reviews"))
    db.commit(); db.refresh(r)
    return review_out(r)


@router.patch("/reviews/{rid}/approve", response_model=ReviewOut)
def approve_review(rid: int, approve: bool = True, db: Session = Depends(get_db),
                   _: User = Depends(require_admin)):
    r = db.get(Review, rid)
    if not r:
        raise HTTPException(404, "التقييم غير موجود")
    r.is_approved = approve
    db.flush()
    _refresh_rating(db, r.product_id)
    db.commit(); db.refresh(r)
    return review_out(r)


@router.delete("/reviews/{rid}")
def delete_review(rid: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    r = db.get(Review, rid)
    if not r:
        raise HTTPException(404, "التقييم غير موجود")
    pid = r.product_id
    db.delete(r); db.flush()
    _refresh_rating(db, pid)
    db.commit()
    return {"ok": True}


# ------------------------------------------------------------------ blog
@router.get("/posts", response_model=List[PostOut])
def list_posts(db: Session = Depends(get_db), q: Optional[str] = None,
               include_drafts: bool = False,
               user: Optional[User] = Depends(get_current_user_optional)):
    query = db.query(Post)
    if not (include_drafts and user and user.role == UserRole.admin):
        query = query.filter(Post.is_published.is_(True))
    if q:
        like = f"%{q}%"
        query = query.filter(or_(Post.title_ar.ilike(like), Post.title_en.ilike(like),
                                 Post.body_ar.ilike(like), Post.body_en.ilike(like)))
    return [post_out(p) for p in query.order_by(Post.published_at.desc()).all()]


@router.get("/posts/{ident}", response_model=PostOut)
def get_post(ident: str, db: Session = Depends(get_db)):
    p = db.get(Post, int(ident)) if ident.isdigit() else None
    if not p:
        p = db.query(Post).filter(Post.slug == ident).first()
    if not p:
        raise HTTPException(404, "المقال غير موجود")
    p.views = (p.views or 0) + 1
    db.commit()
    return post_out(p)


@router.post("/posts", response_model=PostOut)
def create_post(payload: PostIn, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    if db.query(Post).filter(Post.slug == payload.slug).first():
        raise HTTPException(400, "المعرّف (slug) مستخدم")
    p = Post(**payload.model_dump(), published_at=datetime.utcnow())
    db.add(p); db.commit(); db.refresh(p)
    return post_out(p)


@router.put("/posts/{pid}", response_model=PostOut)
def update_post(pid: int, payload: PostIn, db: Session = Depends(get_db),
                _: User = Depends(require_admin)):
    p = db.get(Post, pid)
    if not p:
        raise HTTPException(404, "المقال غير موجود")
    for k, v in payload.model_dump().items():
        setattr(p, k, v)
    db.commit(); db.refresh(p)
    return post_out(p)


@router.delete("/posts/{pid}")
def delete_post(pid: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    p = db.get(Post, pid)
    if not p:
        raise HTTPException(404, "المقال غير موجود")
    db.delete(p); db.commit()
    return {"ok": True}


# --------------------------------------------------------- notifications
@router.get("/notifications", response_model=List[NotificationOut])
def my_notifications(db: Session = Depends(get_db), user: User = Depends(get_current_user),
                     unread_only: bool = False):
    q = db.query(Notification)
    if user.role == UserRole.admin:
        q = q.filter(or_(Notification.for_admin.is_(True), Notification.user_id == user.id))
    else:
        q = q.filter(Notification.user_id == user.id)
    if unread_only:
        q = q.filter(Notification.is_read.is_(False))
    return [notification_out(n) for n in q.order_by(Notification.id.desc()).limit(100).all()]


@router.post("/notifications/{nid}/read")
def mark_read(nid: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    n = db.get(Notification, nid)
    if not n:
        raise HTTPException(404, "غير موجود")
    if n.user_id and n.user_id != user.id and user.role != UserRole.admin:
        raise HTTPException(403, "غير مصرح")
    n.is_read = True
    db.commit()
    return {"ok": True}


@router.post("/notifications/read-all")
def mark_all_read(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    q = db.query(Notification)
    if user.role == UserRole.admin:
        q = q.filter(or_(Notification.for_admin.is_(True), Notification.user_id == user.id))
    else:
        q = q.filter(Notification.user_id == user.id)
    for n in q.filter(Notification.is_read.is_(False)).all():
        n.is_read = True
    db.commit()
    return {"ok": True}


# ------------------------------------------------------------------ users
@router.get("/users", response_model=List[UserOut])
def list_users(db: Session = Depends(get_db), _: User = Depends(require_admin),
               q: Optional[str] = None, role: Optional[str] = None):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    if q:
        like = f"%{q}%"
        query = query.filter(or_(User.name.ilike(like), User.email.ilike(like),
                                 User.phone.ilike(like), User.organization.ilike(like)))
    return [user_out(u) for u in query.order_by(User.id.desc()).all()]


@router.get("/users/{uid}")
def user_detail(uid: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    u = db.get(User, uid)
    if not u:
        raise HTTPException(404, "المستخدم غير موجود")
    orders = db.query(Order).filter(Order.user_id == uid).all()
    spent = sum(o.total or 0 for o in orders
                if o.status in (OrderStatus.completed, OrderStatus.returned, OrderStatus.active))
    return {**user_out(u), "orders_count": len(orders), "total_spent": round(spent, 2)}


@router.patch("/users/{uid}/toggle")
def toggle_user(uid: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    u = db.get(User, uid)
    if not u:
        raise HTTPException(404, "المستخدم غير موجود")
    if u.id == admin.id:
        raise HTTPException(400, "لا يمكنك إيقاف حسابك")
    u.is_active = not u.is_active
    db.commit()
    return {"ok": True, "is_active": u.is_active}


# --------------------------------------------------------------- settings
DEFAULT_SETTINGS = {
    "company_name_ar": settings.COMPANY_NAME_AR,
    "company_name_en": settings.COMPANY_NAME_EN,
    "phone": settings.COMPANY_PHONE,
    "whatsapp": settings.COMPANY_WHATSAPP,
    "email": settings.COMPANY_EMAIL,
    "address_ar": settings.COMPANY_ADDRESS_AR,
    "address_en": settings.COMPANY_ADDRESS_EN,
    "currency_ar": settings.CURRENCY_AR,
    "currency_en": settings.CURRENCY_EN,
    "delivery_fee": "0",
    "hero_title_ar": "تأجير وبيع المناظير والأجهزة الطبية",
    "hero_title_en": "Medical Endoscopes & Equipment — Rental & Sales",
    "hero_sub_ar": "أجهزة معتمدة، صيانة وتعقيم بعد كل استخدام، وتسليم لباب عيادتك.",
    "hero_sub_en": "Certified devices, sterilized after every use, delivered to your clinic.",
}


@router.get("/settings")
def get_settings(db: Session = Depends(get_db)):
    rows = {s.key: s.value for s in db.query(Setting).all()}
    data = {**DEFAULT_SETTINGS, **rows}
    data["stripe_enabled"] = settings.stripe_enabled
    data["stripe_publishable_key"] = settings.STRIPE_PUBLISHABLE_KEY
    return data


@router.put("/settings")
def update_settings(payload: dict, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    for k, v in payload.items():
        if k in ("stripe_enabled", "stripe_publishable_key"):
            continue
        row = db.get(Setting, k)
        if row:
            row.value = str(v)
        else:
            db.add(Setting(key=k, value=str(v)))
    db.commit()
    return get_settings(db)
