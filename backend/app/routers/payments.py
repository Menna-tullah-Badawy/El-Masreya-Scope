"""
الدفع: Stripe (حقيقي لو المفاتيح موجودة، ومحاكاة Demo لو مش موجودة) + كاش عند الاستلام
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models import (
    Notification, Order, OrderStatus, Payment, PaymentMethod, PaymentStatus, User, UserRole,
)
from ..security import get_current_user
from ..serializers import order_out

router = APIRouter(prefix="/api/payments", tags=["payments"])


@router.get("/config")
def payment_config():
    return {
        "stripe_enabled": settings.stripe_enabled,
        "publishable_key": settings.STRIPE_PUBLISHABLE_KEY,
        "currency": settings.STRIPE_CURRENCY,
        "methods": [
            {"id": "cash_on_delivery", "label_ar": "الدفع كاش عند الاستلام",
             "label_en": "Cash on delivery", "enabled": True},
            {"id": "stripe", "label_ar": "بطاقة ائتمان (Stripe)",
             "label_en": "Credit card (Stripe)", "enabled": True,
             "demo": not settings.stripe_enabled},
        ],
    }


@router.post("/stripe/intent")
def create_intent(order_id: int, db: Session = Depends(get_db),
                  user: User = Depends(get_current_user)):
    o = db.get(Order, order_id)
    if not o:
        raise HTTPException(404, "الطلب غير موجود")
    if user.role != UserRole.admin and o.user_id != user.id:
        raise HTTPException(403, "غير مصرح")

    paid = sum(p.amount for p in o.payments if p.status == PaymentStatus.paid)
    amount = round(max(0.0, (o.total or 0) - paid), 2)
    if amount <= 0:
        raise HTTPException(400, "لا يوجد مبلغ مستحق")

    if settings.stripe_enabled:
        try:
            import stripe  # type: ignore
        except ImportError:
            raise HTTPException(500, "مكتبة stripe غير مثبتة — pip install stripe")
        stripe.api_key = settings.STRIPE_SECRET_KEY
        intent = stripe.PaymentIntent.create(
            amount=int(amount * 100), currency=settings.STRIPE_CURRENCY,
            metadata={"order_id": str(o.id), "order_code": o.code},
            automatic_payment_methods={"enabled": True},
        )
        db.add(Payment(order_id=o.id, amount=amount, method=PaymentMethod.stripe,
                       status=PaymentStatus.pending, reference=intent.id,
                       note="Stripe PaymentIntent"))
        o.payment_status = PaymentStatus.pending
        db.commit()
        return {"mode": "live", "client_secret": intent.client_secret,
                "amount": amount, "currency": settings.STRIPE_CURRENCY}

    # وضع المحاكاة — للتجربة بدون مفاتيح
    ref = f"demo_pi_{o.code}"
    db.add(Payment(order_id=o.id, amount=amount, method=PaymentMethod.stripe,
                   status=PaymentStatus.pending, reference=ref,
                   note="Demo intent (no Stripe keys configured)"))
    o.payment_status = PaymentStatus.pending
    db.commit()
    return {"mode": "demo", "client_secret": ref, "amount": amount,
            "currency": settings.STRIPE_CURRENCY,
            "message_ar": "وضع تجريبي: لم يتم ضبط مفاتيح Stripe. الدفع سيُحاكى فقط.",
            "message_en": "Demo mode: Stripe keys not configured. Payment is simulated."}


@router.post("/stripe/confirm")
def confirm_demo(order_id: int, reference: str = "", success: bool = True,
                 db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """تأكيد الدفع في وضع المحاكاة (في الوضع الحقيقي يتم عبر webhook)."""
    o = db.get(Order, order_id)
    if not o:
        raise HTTPException(404, "الطلب غير موجود")
    if user.role != UserRole.admin and o.user_id != user.id:
        raise HTTPException(403, "غير مصرح")
    if settings.stripe_enabled:
        raise HTTPException(400, "في الوضع الحقيقي يتم التأكيد عبر Stripe webhook")

    pending = [p for p in o.payments if p.status == PaymentStatus.pending]
    if not pending:
        raise HTTPException(400, "لا توجد عملية دفع معلقة")
    for p in pending:
        p.status = PaymentStatus.paid if success else PaymentStatus.failed
    paid = sum(p.amount for p in o.payments if p.status == PaymentStatus.paid)
    o.payment_status = (PaymentStatus.paid if paid >= (o.total or 0) - 0.01
                        else (PaymentStatus.pending if success else PaymentStatus.failed))
    if success:
        db.add(Notification(user_id=o.user_id, level="success",
                            title_ar="تم الدفع بنجاح ✅", title_en="Payment successful ✅",
                            body_ar=f"طلب {o.code}", body_en=f"Order {o.code}",
                            link=f"/orders/{o.id}"))
        db.add(Notification(for_admin=True, level="success",
                            title_ar="دفعة أونلاين جديدة", title_en="New online payment",
                            body_ar=f"طلب {o.code} — {paid:.2f} ج.م",
                            body_en=f"Order {o.code} — EGP {paid:.2f}",
                            link=f"/admin/orders/{o.id}"))
    db.commit(); db.refresh(o)
    return order_out(o)


@router.post("/stripe/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    if not settings.stripe_enabled:
        raise HTTPException(400, "Stripe غير مفعّل")
    import stripe  # type: ignore
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(payload, sig, settings.STRIPE_WEBHOOK_SECRET)
    except Exception as e:
        raise HTTPException(400, f"توقيع غير صالح: {e}")

    if event["type"] in ("payment_intent.succeeded", "payment_intent.payment_failed"):
        pi = event["data"]["object"]
        pay = db.query(Payment).filter(Payment.reference == pi["id"]).first()
        if pay:
            ok = event["type"] == "payment_intent.succeeded"
            pay.status = PaymentStatus.paid if ok else PaymentStatus.failed
            o = db.get(Order, pay.order_id)
            if o:
                paid = sum(p.amount for p in o.payments if p.status == PaymentStatus.paid)
                o.payment_status = (PaymentStatus.paid if paid >= (o.total or 0) - 0.01
                                    else PaymentStatus.pending)
                db.add(Notification(user_id=o.user_id, level="success" if ok else "danger",
                                    title_ar="تحديث حالة الدفع", title_en="Payment update",
                                    body_ar=f"طلب {o.code}", body_en=f"Order {o.code}",
                                    link=f"/orders/{o.id}"))
            db.commit()
    return {"received": True}
