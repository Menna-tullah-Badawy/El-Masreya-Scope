"""تحويل نماذج قاعدة البيانات إلى استجابات API"""
from datetime import date
from typing import Optional

from sqlalchemy.orm import Session

from . import models as m
from .pricing import availability


def user_out(u: m.User) -> dict:
    return {
        "id": u.id, "name": u.name, "email": u.email, "phone": u.phone or "",
        "role": u.role.value, "organization": u.organization or "",
        "city": u.city or "", "address": u.address or "",
        "is_active": u.is_active, "created_at": u.created_at,
    }


def category_out(c: m.Category, product_count: int = 0) -> dict:
    return {
        "id": c.id, "slug": c.slug, "name_ar": c.name_ar, "name_en": c.name_en,
        "description_ar": c.description_ar or "", "description_en": c.description_en or "",
        "icon": c.icon or "🩺", "sort_order": c.sort_order or 0,
        "is_active": c.is_active, "product_count": product_count,
    }


def product_out(p: m.Product, db: Optional[Session] = None,
                start: Optional[date] = None, end: Optional[date] = None) -> dict:
    units_total = len([u for u in p.units if u.is_active and u.status != m.UnitStatus.retired])
    units_available = len([u for u in p.units if u.status == m.UnitStatus.available and u.is_active])
    if db is not None and start and end:
        av = availability(db, p.id, start, end)
        units_available = av["available"]
    return {
        "id": p.id, "sku": p.sku, "slug": p.slug,
        "name_ar": p.name_ar, "name_en": p.name_en,
        "brand": p.brand or "", "model": p.model or "",
        "category_id": p.category_id,
        "category_name_ar": p.category.name_ar if p.category else "",
        "category_name_en": p.category.name_en if p.category else "",
        "short_ar": p.short_ar or "", "short_en": p.short_en or "",
        "description_ar": p.description_ar or "", "description_en": p.description_en or "",
        "image": p.image or "", "images": p.images or [], "specs": p.specs or [],
        "is_for_rent": p.is_for_rent, "is_for_sale": p.is_for_sale,
        "is_active": p.is_active, "is_featured": p.is_featured,
        "sale_price": p.sale_price or 0, "rent_daily": p.rent_daily or 0,
        "rent_weekly": p.rent_weekly or 0, "rent_monthly": p.rent_monthly or 0,
        "deposit": p.deposit or 0, "late_fee_per_day": p.late_fee_per_day or 0,
        "min_rent_days": p.min_rent_days or 1,
        "requires_training": p.requires_training, "warranty_months": p.warranty_months or 0,
        "rating_avg": round(p.rating_avg or 0, 2), "rating_count": p.rating_count or 0,
        "units_total": units_total, "units_available": units_available,
    }


def unit_out(u: m.Unit) -> dict:
    return {
        "id": u.id, "product_id": u.product_id,
        "product_name_ar": u.product.name_ar if u.product else "",
        "product_name_en": u.product.name_en if u.product else "",
        "serial_number": u.serial_number, "asset_tag": u.asset_tag or "",
        "status": u.status.value, "condition_note": u.condition_note or "",
        "purchase_date": u.purchase_date, "purchase_cost": u.purchase_cost or 0,
        "location": u.location or "", "last_service_at": u.last_service_at,
        "next_service_due": u.next_service_due, "total_rentals": u.total_rentals or 0,
        "is_active": u.is_active,
    }


def order_item_out(i: m.OrderItem) -> dict:
    return {
        "id": i.id, "product_id": i.product_id,
        "product_name_ar": i.product.name_ar if i.product else "",
        "product_name_en": i.product.name_en if i.product else "",
        "product_image": (i.product.image or "") if i.product else "",
        "unit_id": i.unit_id,
        "unit_serial": i.unit.serial_number if i.unit else None,
        "qty": i.qty or 1, "pricing_mode": i.pricing_mode.value,
        "pricing_breakdown": i.pricing_breakdown or {},
        "unit_price": i.unit_price or 0, "deposit": i.deposit or 0,
        "line_total": i.line_total or 0, "returned_at": i.returned_at,
    }


def order_out(o: m.Order) -> dict:
    paid = sum(p.amount for p in o.payments if p.status == m.PaymentStatus.paid)
    return {
        "id": o.id, "code": o.code, "user_id": o.user_id,
        "customer_name": o.user.name if o.user else "",
        "customer_phone": (o.user.phone or "") if o.user else "",
        "type": o.type.value, "status": o.status.value,
        "start_date": o.start_date, "end_date": o.end_date, "days": o.days or 0,
        "actual_return_date": o.actual_return_date,
        "subtotal": round(o.subtotal or 0, 2), "deposit_total": round(o.deposit_total or 0, 2),
        "late_fee_total": round(o.late_fee_total or 0, 2), "discount": round(o.discount or 0, 2),
        "delivery_fee": round(o.delivery_fee or 0, 2), "total": round(o.total or 0, 2),
        "payment_method": o.payment_method.value, "payment_status": o.payment_status.value,
        "contact_name": o.contact_name or "", "contact_phone": o.contact_phone or "",
        "delivery_address": o.delivery_address or "", "notes": o.notes or "",
        "admin_note": o.admin_note or "",
        "created_at": o.created_at, "approved_at": o.approved_at,
        "items": [order_item_out(i) for i in o.items],
        "invoice_number": o.invoice.number if o.invoice else None,
        "amount_paid": round(paid, 2),
        "amount_due": round(max(0.0, (o.total or 0) - paid), 2),
    }


def ticket_out(t: m.MaintenanceTicket) -> dict:
    return {
        "id": t.id, "code": t.code, "unit_id": t.unit_id,
        "unit_serial": t.unit.serial_number if t.unit else "",
        "product_name_ar": t.unit.product.name_ar if t.unit and t.unit.product else "",
        "product_name_en": t.unit.product.name_en if t.unit and t.unit.product else "",
        "type": t.type.value, "status": t.status.value, "priority": t.priority.value,
        "title": t.title, "description": t.description or "",
        "technician": t.technician or "", "cost": t.cost or 0,
        "scheduled_at": t.scheduled_at, "completed_at": t.completed_at,
        "next_due_at": t.next_due_at, "created_at": t.created_at,
    }


def review_out(r: m.Review) -> dict:
    return {
        "id": r.id, "product_id": r.product_id,
        "product_name_ar": r.product.name_ar if r.product else "",
        "user_id": r.user_id, "user_name": r.user.name if r.user else "",
        "rating": r.rating, "comment": r.comment or "",
        "is_approved": r.is_approved, "created_at": r.created_at,
    }


def post_out(p: m.Post) -> dict:
    return {
        "id": p.id, "slug": p.slug, "title_ar": p.title_ar, "title_en": p.title_en,
        "excerpt_ar": p.excerpt_ar or "", "excerpt_en": p.excerpt_en or "",
        "body_ar": p.body_ar or "", "body_en": p.body_en or "",
        "cover": p.cover or "", "author": p.author or "", "tags": p.tags or [],
        "is_published": p.is_published, "published_at": p.published_at, "views": p.views or 0,
    }


def notification_out(n: m.Notification) -> dict:
    return {
        "id": n.id, "title_ar": n.title_ar or "", "title_en": n.title_en or "",
        "body_ar": n.body_ar or "", "body_en": n.body_en or "",
        "level": n.level or "info", "link": n.link or "",
        "is_read": n.is_read, "created_at": n.created_at,
    }
