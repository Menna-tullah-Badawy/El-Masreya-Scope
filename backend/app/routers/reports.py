"""لوحة المعلومات والتقارير"""
from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (
    MaintenanceTicket, Order, OrderItem, OrderStatus, OrderType, Payment,
    PaymentStatus, Product, TicketStatus, Unit, UnitStatus, User, UserRole,
)
from ..security import require_admin

router = APIRouter(prefix="/api/reports", tags=["reports"])

REVENUE_STATUSES = (OrderStatus.approved, OrderStatus.active,
                    OrderStatus.returned, OrderStatus.completed)


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    today = date.today()
    month_start = today.replace(day=1)

    orders = db.query(Order).all()
    revenue_orders = [o for o in orders if o.status in REVENUE_STATUSES]
    revenue_total = sum((o.subtotal or 0) + (o.late_fee_total or 0) - (o.discount or 0)
                        for o in revenue_orders)
    revenue_month = sum((o.subtotal or 0) + (o.late_fee_total or 0) - (o.discount or 0)
                        for o in revenue_orders if o.created_at and o.created_at.date() >= month_start)
    collected = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
        Payment.status == PaymentStatus.paid).scalar() or 0
    outstanding = sum(max(0, (o.total or 0) - sum(p.amount for p in o.payments
                                                  if p.status == PaymentStatus.paid))
                      for o in revenue_orders)

    units = db.query(Unit).filter(Unit.is_active.is_(True)).all()
    by_status = {}
    for u in units:
        by_status[u.status.value] = by_status.get(u.status.value, 0) + 1

    active_rentals = [o for o in orders if o.status == OrderStatus.active and o.type == OrderType.rent]
    overdue = [o for o in active_rentals if o.end_date and o.end_date < today]
    due_soon = [o for o in active_rentals
                if o.end_date and today <= o.end_date <= today + timedelta(days=3)]

    # الإيرادات آخر 6 أشهر
    series = []
    for i in range(5, -1, -1):
        m = (month_start - timedelta(days=1)).replace(day=1) if i else month_start
        ref = month_start
        for _k in range(i):
            ref = (ref - timedelta(days=1)).replace(day=1)
        nxt = (ref + timedelta(days=32)).replace(day=1)
        val = sum((o.subtotal or 0) + (o.late_fee_total or 0) - (o.discount or 0)
                  for o in revenue_orders if o.created_at and ref <= o.created_at.date() < nxt)
        series.append({"month": ref.strftime("%Y-%m"), "revenue": round(val, 2),
                       "orders": len([o for o in revenue_orders
                                      if o.created_at and ref <= o.created_at.date() < nxt])})

    top = (db.query(OrderItem.product_id, func.count(OrderItem.id).label("c"),
                    func.sum(OrderItem.line_total).label("rev"))
           .group_by(OrderItem.product_id).order_by(func.sum(OrderItem.line_total).desc())
           .limit(6).all())
    top_products = []
    for pid, c, rev in top:
        p = db.get(Product, pid)
        if p:
            top_products.append({"product_id": pid, "name_ar": p.name_ar, "name_en": p.name_en,
                                 "orders": int(c), "revenue": round(float(rev or 0), 2)})

    return {
        "kpis": {
            "revenue_total": round(revenue_total, 2),
            "revenue_month": round(revenue_month, 2),
            "collected": round(float(collected), 2),
            "outstanding": round(outstanding, 2),
            "orders_total": len(orders),
            "orders_pending": len([o for o in orders if o.status == OrderStatus.pending]),
            "orders_active": len(active_rentals),
            "orders_overdue": len(overdue),
            "customers": db.query(User).filter(User.role == UserRole.customer).count(),
            "products": db.query(Product).filter(Product.is_active.is_(True)).count(),
            "units": len(units),
            "units_available": by_status.get("available", 0),
            "tickets_open": db.query(MaintenanceTicket).filter(
                MaintenanceTicket.status.in_([TicketStatus.open, TicketStatus.in_progress])).count(),
        },
        "units_by_status": by_status,
        "revenue_series": series,
        "top_products": top_products,
        "overdue_orders": [{"id": o.id, "code": o.code, "customer": o.user.name if o.user else "",
                            "end_date": o.end_date, "days_late": (today - o.end_date).days}
                           for o in overdue],
        "due_soon": [{"id": o.id, "code": o.code, "customer": o.user.name if o.user else "",
                      "end_date": o.end_date} for o in due_soon],
    }


@router.get("/revenue")
def revenue_report(start: Optional[date] = None, end: Optional[date] = None,
                   db: Session = Depends(get_db), _: User = Depends(require_admin)):
    start = start or date.today().replace(day=1)
    end = end or date.today()
    orders = (db.query(Order)
              .filter(Order.status.in_(REVENUE_STATUSES),
                      func.date(Order.created_at) >= start,
                      func.date(Order.created_at) <= end).all())
    rent = [o for o in orders if o.type == OrderType.rent]
    sale = [o for o in orders if o.type == OrderType.sale]
    calc = lambda arr: round(sum((o.subtotal or 0) + (o.late_fee_total or 0) - (o.discount or 0)
                                 for o in arr), 2)
    return {
        "start": start, "end": end,
        "rent": {"orders": len(rent), "revenue": calc(rent)},
        "sale": {"orders": len(sale), "revenue": calc(sale)},
        "late_fees": round(sum(o.late_fee_total or 0 for o in orders), 2),
        "deposits_held": round(sum(o.deposit_total or 0 for o in orders
                                   if o.status in (OrderStatus.active, OrderStatus.approved)), 2),
        "total": calc(orders),
        "rows": [{"code": o.code, "date": o.created_at.date() if o.created_at else None,
                  "customer": o.user.name if o.user else "", "type": o.type.value,
                  "status": o.status.value, "total": round(o.total or 0, 2)} for o in orders],
    }


@router.get("/inventory")
def inventory_report(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    products = db.query(Product).filter(Product.is_active.is_(True)).all()
    rows = []
    for p in products:
        us = [u for u in p.units if u.is_active]
        rows.append({
            "product_id": p.id, "name_ar": p.name_ar, "name_en": p.name_en,
            "sku": p.sku, "total": len(us),
            "available": len([u for u in us if u.status == UnitStatus.available]),
            "rented": len([u for u in us if u.status == UnitStatus.rented]),
            "reserved": len([u for u in us if u.status == UnitStatus.reserved]),
            "maintenance": len([u for u in us if u.status in
                                (UnitStatus.maintenance, UnitStatus.sterilizing)]),
            "utilization": round(
                100 * len([u for u in us if u.status in (UnitStatus.rented, UnitStatus.reserved)])
                / len(us), 1) if us else 0.0,
            "asset_value": round(sum(u.purchase_cost or 0 for u in us), 2),
        })
    rows.sort(key=lambda r: -r["utilization"])
    return {"rows": rows,
            "totals": {"units": sum(r["total"] for r in rows),
                       "asset_value": round(sum(r["asset_value"] for r in rows), 2)}}
