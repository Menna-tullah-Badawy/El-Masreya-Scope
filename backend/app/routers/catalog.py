"""الكتالوج: الأقسام + المنتجات + الوحدات + التوافر + عرض السعر"""
from datetime import date, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Category, Product, Unit, UnitStatus, User
from ..pricing import availability, best_rent_price, busy_days_map, date_span_days
from ..schemas import (
    CategoryIn, CategoryOut, ProductIn, ProductOut, UnitIn, UnitOut, QuoteIn,
)
from ..security import require_admin
from ..serializers import category_out, product_out, unit_out

router = APIRouter(prefix="/api", tags=["catalog"])


# ------------------------------------------------------------- categories
@router.get("/categories", response_model=List[CategoryOut])
def list_categories(db: Session = Depends(get_db), include_inactive: bool = False):
    q = db.query(Category)
    if not include_inactive:
        q = q.filter(Category.is_active.is_(True))
    cats = q.order_by(Category.sort_order, Category.id).all()
    counts = dict(
        db.query(Product.category_id, func.count(Product.id))
        .filter(Product.is_active.is_(True))
        .group_by(Product.category_id).all()
    )
    return [category_out(c, counts.get(c.id, 0)) for c in cats]


@router.post("/categories", response_model=CategoryOut)
def create_category(payload: CategoryIn, db: Session = Depends(get_db),
                    _: User = Depends(require_admin)):
    if db.query(Category).filter(Category.slug == payload.slug).first():
        raise HTTPException(400, "المعرّف (slug) مستخدم بالفعل")
    c = Category(**payload.model_dump())
    db.add(c); db.commit(); db.refresh(c)
    return category_out(c)


@router.put("/categories/{cid}", response_model=CategoryOut)
def update_category(cid: int, payload: CategoryIn, db: Session = Depends(get_db),
                    _: User = Depends(require_admin)):
    c = db.get(Category, cid)
    if not c:
        raise HTTPException(404, "القسم غير موجود")
    for k, v in payload.model_dump().items():
        setattr(c, k, v)
    db.commit(); db.refresh(c)
    return category_out(c)


@router.delete("/categories/{cid}")
def delete_category(cid: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    c = db.get(Category, cid)
    if not c:
        raise HTTPException(404, "القسم غير موجود")
    if db.query(Product).filter(Product.category_id == cid).count():
        raise HTTPException(400, "لا يمكن حذف قسم يحتوي على منتجات")
    db.delete(c); db.commit()
    return {"ok": True}


# --------------------------------------------------------------- products
@router.get("/products", response_model=List[ProductOut])
def list_products(
    db: Session = Depends(get_db),
    q: Optional[str] = None,
    category: Optional[str] = None,
    category_id: Optional[int] = None,
    mode: Optional[str] = Query(None, description="rent | sale"),
    featured: Optional[bool] = None,
    brand: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort: str = "newest",
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    include_inactive: bool = False,
    limit: int = 200,
    offset: int = 0,
):
    query = db.query(Product)
    if not include_inactive:
        query = query.filter(Product.is_active.is_(True))
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(or_(
            Product.name_ar.ilike(like), Product.name_en.ilike(like),
            Product.brand.ilike(like), Product.model.ilike(like),
            Product.sku.ilike(like), Product.short_ar.ilike(like),
            Product.short_en.ilike(like),
        ))
    if category:
        cat = db.query(Category).filter(Category.slug == category).first()
        if cat:
            query = query.filter(Product.category_id == cat.id)
        else:
            return []
    if category_id:
        query = query.filter(Product.category_id == category_id)
    if mode == "rent":
        query = query.filter(Product.is_for_rent.is_(True))
    elif mode == "sale":
        query = query.filter(Product.is_for_sale.is_(True))
    if featured is not None:
        query = query.filter(Product.is_featured.is_(featured))
    if brand:
        query = query.filter(Product.brand.ilike(f"%{brand}%"))
    # فلترة السعر — حسب وضع الإيجار/البيع (أدق من الـ OR العام)
    if min_price is not None or max_price is not None:
        if mode == "rent":
            if min_price is not None:
                query = query.filter(Product.rent_daily >= min_price)
            if max_price is not None:
                query = query.filter(Product.rent_daily <= max_price)
        elif mode == "sale":
            if min_price is not None:
                query = query.filter(Product.sale_price >= min_price)
            if max_price is not None:
                query = query.filter(Product.sale_price <= max_price)
        else:
            # بدون تحديد وضع: نفلتر إذا أي من السعرين يقع في المدى
            if min_price is not None:
                query = query.filter(or_(Product.rent_daily >= min_price, Product.sale_price >= min_price))
            if max_price is not None:
                query = query.filter(or_(Product.rent_daily <= max_price, Product.sale_price <= max_price))

    if sort == "price_asc":
        query = query.order_by(Product.rent_daily.asc())
    elif sort == "price_desc":
        query = query.order_by(Product.rent_daily.desc())
    elif sort == "rating":
        query = query.order_by(Product.rating_avg.desc())
    elif sort == "popular":
        query = query.order_by(Product.views.desc())
    else:
        query = query.order_by(Product.id.desc())

    items = query.offset(offset).limit(limit).all()
    return [product_out(p, db, start_date, end_date) for p in items]


@router.get("/products/brands")
def list_brands(db: Session = Depends(get_db)):
    rows = db.query(Product.brand).filter(Product.brand != "", Product.is_active.is_(True)).distinct().all()
    return sorted({r[0] for r in rows if r[0]})


@router.get("/products/{ident}", response_model=ProductOut)
def get_product(ident: str, db: Session = Depends(get_db),
                start_date: Optional[date] = None, end_date: Optional[date] = None):
    p = None
    if ident.isdigit():
        p = db.get(Product, int(ident))
    if not p:
        p = db.query(Product).filter(Product.slug == ident).first()
    if not p:
        raise HTTPException(404, "المنتج غير موجود")
    p.views = (p.views or 0) + 1
    db.commit()
    return product_out(p, db, start_date, end_date)


@router.post("/products", response_model=ProductOut)
def create_product(payload: ProductIn, db: Session = Depends(get_db),
                   _: User = Depends(require_admin)):
    if db.query(Product).filter(or_(Product.sku == payload.sku,
                                    Product.slug == payload.slug)).first():
        raise HTTPException(400, "SKU أو slug مستخدم بالفعل")
    data = payload.model_dump()
    data["specs"] = [s if isinstance(s, dict) else s.model_dump() for s in payload.specs]
    p = Product(**data)
    db.add(p); db.commit(); db.refresh(p)
    return product_out(p)


@router.put("/products/{pid}", response_model=ProductOut)
def update_product(pid: int, payload: ProductIn, db: Session = Depends(get_db),
                   _: User = Depends(require_admin)):
    p = db.get(Product, pid)
    if not p:
        raise HTTPException(404, "المنتج غير موجود")
    data = payload.model_dump()
    data["specs"] = [s if isinstance(s, dict) else s.model_dump() for s in payload.specs]
    for k, v in data.items():
        setattr(p, k, v)
    db.commit(); db.refresh(p)
    return product_out(p)


@router.delete("/products/{pid}")
def delete_product(pid: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    p = db.get(Product, pid)
    if not p:
        raise HTTPException(404, "المنتج غير موجود")
    p.is_active = False           # حذف ناعم للحفاظ على سجل الطلبات
    db.commit()
    return {"ok": True, "soft_deleted": True}


# ------------------------------------------------------------------ units
@router.get("/units", response_model=List[UnitOut])
def list_units(db: Session = Depends(get_db), _: User = Depends(require_admin),
               product_id: Optional[int] = None, status: Optional[str] = None,
               q: Optional[str] = None):
    query = db.query(Unit)
    if product_id:
        query = query.filter(Unit.product_id == product_id)
    if status:
        query = query.filter(Unit.status == status)
    if q:
        query = query.filter(Unit.serial_number.ilike(f"%{q}%"))
    return [unit_out(u) for u in query.order_by(Unit.id.desc()).all()]


@router.post("/units", response_model=UnitOut)
def create_unit(payload: UnitIn, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    if db.query(Unit).filter(Unit.serial_number == payload.serial_number).first():
        raise HTTPException(400, "الرقم التسلسلي مسجل بالفعل")
    if not db.get(Product, payload.product_id):
        raise HTTPException(404, "المنتج غير موجود")
    u = Unit(**payload.model_dump())
    db.add(u); db.commit(); db.refresh(u)
    return unit_out(u)


@router.put("/units/{uid}", response_model=UnitOut)
def update_unit(uid: int, payload: UnitIn, db: Session = Depends(get_db),
                _: User = Depends(require_admin)):
    u = db.get(Unit, uid)
    if not u:
        raise HTTPException(404, "الوحدة غير موجودة")
    dup = db.query(Unit).filter(Unit.serial_number == payload.serial_number,
                                Unit.id != uid).first()
    if dup:
        raise HTTPException(400, "الرقم التسلسلي مستخدم في وحدة أخرى")
    for k, v in payload.model_dump().items():
        setattr(u, k, v)
    db.commit(); db.refresh(u)
    return unit_out(u)


@router.delete("/units/{uid}")
def delete_unit(uid: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    u = db.get(Unit, uid)
    if not u:
        raise HTTPException(404, "الوحدة غير موجودة")
    u.is_active = False
    u.status = UnitStatus.retired
    db.commit()
    return {"ok": True}


# ----------------------------------------------------- availability/quote
@router.get("/availability/{product_id}")
def get_availability(product_id: int, start_date: date, end_date: date,
                     db: Session = Depends(get_db)):
    if end_date < start_date:
        raise HTTPException(400, "تاريخ النهاية قبل تاريخ البداية")
    if not db.get(Product, product_id):
        raise HTTPException(404, "المنتج غير موجود")
    return availability(db, product_id, start_date, end_date)


@router.get("/availability/{product_id}/calendar")
def get_calendar(product_id: int, months: int = 3, db: Session = Depends(get_db)):
    if not db.get(Product, product_id):
        raise HTTPException(404, "المنتج غير موجود")
    return {"product_id": product_id, "busy_dates": busy_days_map(db, product_id, months)}


@router.post("/quote")
def quote(payload: QuoteIn, db: Session = Depends(get_db)):
    p = db.get(Product, payload.product_id)
    if not p:
        raise HTTPException(404, "المنتج غير موجود")
    if payload.end_date < payload.start_date:
        raise HTTPException(400, "تاريخ النهاية قبل تاريخ البداية")
    days = date_span_days(payload.start_date, payload.end_date)
    if days < (p.min_rent_days or 1):
        raise HTTPException(400, f"الحد الأدنى للإيجار {p.min_rent_days} يوم")
    price = best_rent_price(p, days)
    qty = max(1, payload.qty)
    av = availability(db, p.id, payload.start_date, payload.end_date)
    return {
        **price,
        "qty": qty,
        "subtotal": round(price["total"] * qty, 2),
        "deposit": round((p.deposit or 0) * qty, 2),
        "grand_total": round(price["total"] * qty + (p.deposit or 0) * qty, 2),
        "late_fee_per_day": p.late_fee_per_day or 0,
        "availability": av,
    }
