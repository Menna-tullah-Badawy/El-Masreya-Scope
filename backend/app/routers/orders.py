"""الطلبات: إنشاء / موافقة / تخصيص وحدات / تسليم / استرجاع / غرامات / دفعات"""
import random
import string
from datetime import date, datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (
    Contract, Invoice, Notification, Order, OrderItem, OrderStatus, OrderType,
    Payment, PaymentMethod, PaymentStatus, PricingMode, Product, Unit, UnitStatus,
    User, UserRole, MaintenanceTicket, TicketType, TicketStatus,
)
from ..pricing import availability, best_rent_price, date_span_days
from ..schemas import (
    AssignUnitIn, OrderIn, OrderOut, OrderStatusIn, PaymentIn, ReturnIn,
)
from ..security import get_current_user, require_admin
from ..serializers import order_out

router = APIRouter(prefix="/api/orders", tags=["orders"])


def _code(prefix: str) -> str:
    return f"{prefix}-{datetime.utcnow():%y%m}-" + "".join(random.choices(string.digits, k=5))


def _notify(db: Session, *, user_id: Optional[int] = None, for_admin: bool = False,
            title_ar="", title_en="", body_ar="", body_en="", level="info", link=""):
    db.add(Notification(user_id=user_id, for_admin=for_admin, title_ar=title_ar,
                        title_en=title_en, body_ar=body_ar, body_en=body_en,
                        level=level, link=link))


def _recalc(order: Order):
    order.subtotal = round(sum(i.line_total or 0 for i in order.items), 2)
    order.deposit_total = round(sum((i.deposit or 0) * (i.qty or 1) for i in order.items), 2)
    order.total = round(
        (order.subtotal or 0) + (order.deposit_total or 0) + (order.late_fee_total or 0)
        + (order.delivery_fee or 0) - (order.discount or 0), 2
    )


# ------------------------------------------------------------------ create
@router.post("", response_model=OrderOut)
def create_order(payload: OrderIn, db: Session = Depends(get_db),
                 user: User = Depends(get_current_user)):
    if not payload.items:
        raise HTTPException(400, "السلة فارغة")

    otype = OrderType(payload.type)
    order = Order(
        code=_code("ORD"), user_id=user.id, type=otype,
        status=OrderStatus.pending,
        payment_method=PaymentMethod(payload.payment_method),
        contact_name=payload.contact_name or user.name,
        contact_phone=payload.contact_phone or (user.phone or ""),
        delivery_address=payload.delivery_address or (user.address or ""),
        notes=payload.notes or "",
    )

    if otype == OrderType.rent:
        if not payload.start_date or not payload.end_date:
            raise HTTPException(400, "يجب تحديد تاريخ البداية والنهاية للإيجار")
        if payload.end_date < payload.start_date:
            raise HTTPException(400, "تاريخ النهاية قبل تاريخ البداية")
        if payload.start_date < date.today():
            raise HTTPException(400, "لا يمكن الحجز في تاريخ ماضٍ")
        order.start_date = payload.start_date
        order.end_date = payload.end_date
        order.days = date_span_days(payload.start_date, payload.end_date)

    db.add(order)
    db.flush()

    for it in payload.items:
        p = db.get(Product, it.product_id)
        if not p or not p.is_active:
            raise HTTPException(404, f"المنتج #{it.product_id} غير متاح")
        qty = max(1, it.qty)

        if otype == OrderType.rent:
            if not p.is_for_rent:
                raise HTTPException(400, f"«{p.name_ar}» غير متاح للإيجار")
            if order.days < (p.min_rent_days or 1):
                raise HTTPException(400, f"«{p.name_ar}»: الحد الأدنى {p.min_rent_days} يوم")
            av = availability(db, p.id, order.start_date, order.end_date, exclude_order_id=order.id)
            if av["available"] < qty:
                raise HTTPException(
                    409,
                    f"«{p.name_ar}» غير متاح في هذه الفترة (المتاح: {av['available']})",
                )
            price = best_rent_price(p, order.days)
            item = OrderItem(
                order_id=order.id, product_id=p.id, qty=qty,
                pricing_mode=PricingMode(price["mode"]),
                pricing_breakdown=price["breakdown"],
                unit_price=price["total"], deposit=p.deposit or 0,
                line_total=round(price["total"] * qty, 2),
            )
        else:
            if not p.is_for_sale:
                raise HTTPException(400, f"«{p.name_ar}» غير متاح للبيع")
            available_now = len([u for u in p.units
                                 if u.status == UnitStatus.available and u.is_active])
            if available_now < qty:
                raise HTTPException(409, f"«{p.name_ar}»: المخزون المتاح {available_now} فقط")
            item = OrderItem(
                order_id=order.id, product_id=p.id, qty=qty,
                pricing_mode=PricingMode.sale, pricing_breakdown={},
                unit_price=p.sale_price or 0, deposit=0,
                line_total=round((p.sale_price or 0) * qty, 2),
            )
        db.add(item)
        order.items.append(item)

    _recalc(order)
    _notify(db, for_admin=True, level="info",
            title_ar="طلب جديد بانتظار المراجعة", title_en="New order awaiting review",
            body_ar=f"طلب {order.code} من {user.name} بقيمة {order.total:.2f} ج.م",
            body_en=f"Order {order.code} from {user.name} — EGP {order.total:.2f}",
            link=f"/admin/orders/{order.id}")
    _notify(db, user_id=user.id, level="success",
            title_ar="تم استلام طلبك", title_en="Order received",
            body_ar=f"رقم الطلب {order.code}. سيتم مراجعته والرد خلال وقت قصير.",
            body_en=f"Order {order.code} received. We will review it shortly.",
            link=f"/orders/{order.id}")
    db.commit(); db.refresh(order)
    return order_out(order)


# -------------------------------------------------------------------- read
@router.get("", response_model=List[OrderOut])
def list_orders(db: Session = Depends(get_db), user: User = Depends(get_current_user),
                status: Optional[str] = None, type: Optional[str] = None,
                q: Optional[str] = None, mine: Optional[bool] = None,
                limit: int = 200, offset: int = 0):
    query = db.query(Order)
    if user.role != UserRole.admin or mine:
        query = query.filter(Order.user_id == user.id)
    if status:
        query = query.filter(Order.status == status)
    if type:
        query = query.filter(Order.type == type)
    if q:
        query = query.filter(Order.code.ilike(f"%{q}%"))
    orders = query.order_by(Order.id.desc()).offset(offset).limit(limit).all()
    return [order_out(o) for o in orders]


@router.get("/{oid}", response_model=OrderOut)
def get_order(oid: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    o = db.get(Order, oid)
    if not o:
        raise HTTPException(404, "الطلب غير موجود")
    if user.role != UserRole.admin and o.user_id != user.id:
        raise HTTPException(403, "غير مصرح")
    return order_out(o)


# ------------------------------------------------------------- transitions
@router.patch("/{oid}/status", response_model=OrderOut)
def set_status(oid: int, payload: OrderStatusIn, db: Session = Depends(get_db),
               admin: User = Depends(require_admin)):
    o = db.get(Order, oid)
    if not o:
        raise HTTPException(404, "الطلب غير موجود")
    new = OrderStatus(payload.status)

    if payload.discount is not None:
        o.discount = payload.discount
    if payload.delivery_fee is not None:
        o.delivery_fee = payload.delivery_fee
    if payload.admin_note:
        o.admin_note = payload.admin_note

    if new == OrderStatus.approved:
        o.approved_at = datetime.utcnow()
        for i in o.items:
            if i.unit_id:
                u = db.get(Unit, i.unit_id)
                if u and u.status == UnitStatus.available:
                    u.status = UnitStatus.reserved
        if not o.invoice:
            inv = Invoice(order_id=o.id, number=_code("INV"), total=o.total or 0)
            db.add(inv)
        if o.type == OrderType.rent and not db.query(Contract).filter(
                Contract.order_id == o.id).first():
            db.add(Contract(order_id=o.id, number=_code("CTR"),
                            signed_by=o.contact_name or ""))
    elif new == OrderStatus.active:
        for i in o.items:
            if i.unit_id:
                u = db.get(Unit, i.unit_id)
                if u:
                    u.status = UnitStatus.rented
                    u.total_rentals = (u.total_rentals or 0) + 1
    elif new in (OrderStatus.rejected, OrderStatus.cancelled):
        for i in o.items:
            if i.unit_id:
                u = db.get(Unit, i.unit_id)
                if u and u.status in (UnitStatus.reserved, UnitStatus.rented):
                    u.status = UnitStatus.available
    elif new == OrderStatus.completed:
        o.completed_at = datetime.utcnow()

    o.status = new
    _recalc(o)
    if o.invoice:
        o.invoice.total = o.total

    labels = {
        OrderStatus.approved: ("تمت الموافقة على طلبك ✅", "Order approved ✅", "success"),
        OrderStatus.rejected: ("تم رفض الطلب", "Order rejected", "danger"),
        OrderStatus.active: ("تم تسليم الأجهزة 🚚", "Equipment delivered 🚚", "info"),
        OrderStatus.returned: ("تم استلام الأجهزة المرتجعة", "Equipment returned", "info"),
        OrderStatus.completed: ("اكتمل الطلب 🎉", "Order completed 🎉", "success"),
        OrderStatus.cancelled: ("تم إلغاء الطلب", "Order cancelled", "warning"),
        OrderStatus.pending: ("طلبك قيد المراجعة", "Order under review", "info"),
    }
    ar, en, lvl = labels.get(new, ("تحديث على الطلب", "Order updated", "info"))
    _notify(db, user_id=o.user_id, level=lvl, title_ar=ar, title_en=en,
            body_ar=f"طلب رقم {o.code}" + (f" — {payload.admin_note}" if payload.admin_note else ""),
            body_en=f"Order {o.code}" + (f" — {payload.admin_note}" if payload.admin_note else ""),
            link=f"/orders/{o.id}")
    db.commit(); db.refresh(o)
    return order_out(o)


@router.post("/{oid}/assign-unit", response_model=OrderOut)
def assign_unit(oid: int, payload: AssignUnitIn, db: Session = Depends(get_db),
                _: User = Depends(require_admin)):
    o = db.get(Order, oid)
    if not o:
        raise HTTPException(404, "الطلب غير موجود")
    item = db.get(OrderItem, payload.item_id)
    if not item or item.order_id != o.id:
        raise HTTPException(404, "بند الطلب غير موجود")
    unit = db.get(Unit, payload.unit_id)
    if not unit or unit.product_id != item.product_id:
        raise HTTPException(400, "الوحدة لا تنتمي لنفس المنتج")
    if o.type == OrderType.rent and o.start_date and o.end_date:
        av = availability(db, item.product_id, o.start_date, o.end_date, exclude_order_id=o.id)
        if unit.id not in av["unit_ids"] and unit.status != UnitStatus.available:
            raise HTTPException(409, "الوحدة محجوزة في هذه الفترة")
    item.unit_id = unit.id
    if o.status in (OrderStatus.approved,):
        unit.status = UnitStatus.reserved
    db.commit(); db.refresh(o)
    return order_out(o)


@router.get("/{oid}/suggest-units")
def suggest_units(oid: int, item_id: int, db: Session = Depends(get_db),
                  _: User = Depends(require_admin)):
    o = db.get(Order, oid)
    item = db.get(OrderItem, item_id)
    if not o or not item:
        raise HTTPException(404, "غير موجود")
    if o.type == OrderType.rent and o.start_date and o.end_date:
        av = availability(db, item.product_id, o.start_date, o.end_date, exclude_order_id=o.id)
        ids = av["unit_ids"]
        units = db.query(Unit).filter(Unit.id.in_(ids)).all() if ids else []
    else:
        units = db.query(Unit).filter(Unit.product_id == item.product_id,
                                      Unit.status == UnitStatus.available).all()
    return [{"id": u.id, "serial_number": u.serial_number, "location": u.location,
             "status": u.status.value} for u in units]


@router.post("/{oid}/return", response_model=OrderOut)
def return_order(oid: int, payload: ReturnIn, db: Session = Depends(get_db),
                 _: User = Depends(require_admin)):
    """استرجاع الأجهزة + حساب غرامة التأخير تلقائياً."""
    o = db.get(Order, oid)
    if not o:
        raise HTTPException(404, "الطلب غير موجود")
    if o.type != OrderType.rent:
        raise HTTPException(400, "الاسترجاع للإيجار فقط")

    ret = payload.actual_return_date or date.today()
    o.actual_return_date = ret

    late_days = max(0, (ret - o.end_date).days) if o.end_date else 0
    late_total = 0.0
    for i in o.items:
        p = i.product
        if late_days and p and (p.late_fee_per_day or 0) > 0:
            late_total += late_days * (p.late_fee_per_day or 0) * (i.qty or 1)
        i.returned_at = datetime.utcnow()
        i.return_condition = payload.condition_note or ""
        if i.unit_id:
            u = db.get(Unit, i.unit_id)
            if u:
                if payload.send_to_sterilization:
                    u.status = UnitStatus.sterilizing
                    t = MaintenanceTicket(
                        code=_code("TCK"), unit_id=u.id, type=TicketType.sterilization,
                        status=TicketStatus.open,
                        title=f"تعقيم بعد الإيجار — طلب {o.code}",
                        description=payload.condition_note or "تعقيم روتيني بعد الاسترجاع",
                    )
                    db.add(t)
                else:
                    u.status = UnitStatus.available
                u.last_service_at = ret

    o.late_fee_total = round(late_total, 2)
    o.status = OrderStatus.returned
    _recalc(o)
    if o.invoice:
        o.invoice.total = o.total

    if late_days:
        _notify(db, user_id=o.user_id, level="warning",
                title_ar=f"غرامة تأخير {late_days} يوم",
                title_en=f"Late fee — {late_days} day(s)",
                body_ar=f"تمت إضافة {late_total:.2f} ج.م للطلب {o.code}",
                body_en=f"EGP {late_total:.2f} added to order {o.code}",
                link=f"/orders/{o.id}")
    db.commit(); db.refresh(o)
    return order_out(o)


@router.post("/{oid}/payments", response_model=OrderOut)
def add_payment(oid: int, payload: PaymentIn, db: Session = Depends(get_db),
                _: User = Depends(require_admin)):
    o = db.get(Order, oid)
    if not o:
        raise HTTPException(404, "الطلب غير موجود")
    db.add(Payment(order_id=o.id, amount=payload.amount,
                   method=PaymentMethod(payload.method), status=PaymentStatus.paid,
                   reference=payload.reference, note=payload.note))
    db.flush()
    paid = sum(p.amount for p in o.payments if p.status == PaymentStatus.paid)
    o.payment_status = PaymentStatus.paid if paid >= (o.total or 0) - 0.01 else PaymentStatus.pending
    _notify(db, user_id=o.user_id, level="success",
            title_ar="تم تسجيل دفعة", title_en="Payment recorded",
            body_ar=f"{payload.amount:.2f} ج.م على الطلب {o.code}",
            body_en=f"EGP {payload.amount:.2f} on order {o.code}", link=f"/orders/{o.id}")
    db.commit(); db.refresh(o)
    return order_out(o)


@router.get("/{oid}/payments")
def list_payments(oid: int, db: Session = Depends(get_db),
                  user: User = Depends(get_current_user)):
    o = db.get(Order, oid)
    if not o:
        raise HTTPException(404, "الطلب غير موجود")
    if user.role != UserRole.admin and o.user_id != user.id:
        raise HTTPException(403, "غير مصرح")
    return [{"id": p.id, "amount": p.amount, "method": p.method.value,
             "status": p.status.value, "reference": p.reference,
             "note": p.note, "created_at": p.created_at} for p in o.payments]


@router.post("/{oid}/cancel", response_model=OrderOut)
def cancel_my_order(oid: int, db: Session = Depends(get_db),
                    user: User = Depends(get_current_user)):
    o = db.get(Order, oid)
    if not o:
        raise HTTPException(404, "الطلب غير موجود")
    if user.role != UserRole.admin and o.user_id != user.id:
        raise HTTPException(403, "غير مصرح")
    if o.status not in (OrderStatus.pending, OrderStatus.approved):
        raise HTTPException(400, "لا يمكن إلغاء الطلب في حالته الحالية")
    for i in o.items:
        if i.unit_id:
            u = db.get(Unit, i.unit_id)
            if u and u.status == UnitStatus.reserved:
                u.status = UnitStatus.available
    o.status = OrderStatus.cancelled
    _notify(db, for_admin=True, level="warning",
            title_ar="إلغاء طلب من العميل", title_en="Order cancelled by customer",
            body_ar=f"الطلب {o.code}", body_en=f"Order {o.code}",
            link=f"/admin/orders/{o.id}")
    db.commit(); db.refresh(o)
    return order_out(o)
