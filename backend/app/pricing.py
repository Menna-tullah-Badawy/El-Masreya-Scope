"""
محرك التسعير + فحص التوافر
Pricing engine: picks the CHEAPEST combination of monthly / weekly / daily rates.
"""
from datetime import date, timedelta
from typing import Dict, List, Optional, Tuple

from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from .models import (
    Order, OrderItem, OrderStatus, Product, Unit, UnitStatus, PricingMode,
)

WEEK = 7
MONTH = 30

BLOCKING_STATUSES = (
    OrderStatus.pending,
    OrderStatus.approved,
    OrderStatus.active,
)


def best_rent_price(product: Product, days: int) -> Dict:
    """
    يحسب أرخص سعر ممكن لعدد أيام معيّن باستخدام برمجة ديناميكية
    على الأسعار اليومية والأسبوعية والشهرية.
    """
    days = max(1, int(days))
    daily = float(product.rent_daily or 0)
    weekly = float(product.rent_weekly or 0)
    monthly = float(product.rent_monthly or 0)

    # أسعار بديلة لو واحد منهم مش متسجل
    if daily <= 0 and weekly > 0:
        daily = weekly / WEEK
    if daily <= 0 and monthly > 0:
        daily = monthly / MONTH
    if daily <= 0:
        return {
            "total": 0.0, "mode": PricingMode.daily.value,
            "breakdown": {"months": 0, "weeks": 0, "days": days},
            "days": days, "effective_daily": 0.0, "list_price": 0.0, "saving": 0.0,
        }

    if weekly <= 0:
        weekly = daily * WEEK
    if monthly <= 0:
        monthly = daily * MONTH

    INF = float("inf")
    cost = [INF] * (days + 1)
    choice: List[Optional[str]] = [None] * (days + 1)
    cost[0] = 0.0

    for n in range(1, days + 1):
        options: List[Tuple[float, str]] = [(cost[n - 1] + daily, "d")]
        options.append((cost[max(0, n - WEEK)] + weekly, "w"))
        options.append((cost[max(0, n - MONTH)] + monthly, "m"))
        best = min(options, key=lambda x: x[0])
        cost[n], choice[n] = best

    # استرجاع التركيبة
    months = weeks = single_days = 0
    n = days
    while n > 0:
        c = choice[n]
        if c == "m":
            months += 1
            n = max(0, n - MONTH)
        elif c == "w":
            weeks += 1
            n = max(0, n - WEEK)
        else:
            single_days += 1
            n -= 1

    total = round(cost[days], 2)
    if months:
        mode = PricingMode.monthly
    elif weeks:
        mode = PricingMode.weekly
    else:
        mode = PricingMode.daily

    list_price = round(daily * days, 2)
    return {
        "total": total,
        "mode": mode.value,
        "breakdown": {"months": months, "weeks": weeks, "days": single_days},
        "days": days,
        "effective_daily": round(total / days, 2),
        "list_price": list_price,
        "saving": round(max(0.0, list_price - total), 2),
    }


def date_span_days(start: date, end: date) -> int:
    """عدد أيام الإيجار (شامل يوم البداية والنهاية)."""
    return max(1, (end - start).days + 1)


def busy_unit_ids(db: Session, start: date, end: date, exclude_order_id: Optional[int] = None) -> set:
    """أرقام الوحدات المحجوزة/المؤجرة خلال فترة متداخلة."""
    q = (
        db.query(OrderItem.unit_id)
        .join(Order, Order.id == OrderItem.order_id)
        .filter(
            OrderItem.unit_id.isnot(None),
            Order.type == "rent",
            Order.status.in_([s for s in BLOCKING_STATUSES]),
            Order.start_date.isnot(None),
            Order.end_date.isnot(None),
            Order.start_date <= end,
            Order.end_date >= start,
        )
    )
    if exclude_order_id:
        q = q.filter(Order.id != exclude_order_id)
    return {row[0] for row in q.all() if row[0]}


def reserved_qty_for_product(
    db: Session, product_id: int, start: date, end: date, exclude_order_id: Optional[int] = None
) -> int:
    """عدد القطع المحجوزة من منتج في فترة (سواء خُصصت لها وحدة أم لا)."""
    q = (
        db.query(OrderItem)
        .join(Order, Order.id == OrderItem.order_id)
        .filter(
            OrderItem.product_id == product_id,
            Order.type == "rent",
            Order.status.in_([s for s in BLOCKING_STATUSES]),
            Order.start_date.isnot(None),
            Order.end_date.isnot(None),
            Order.start_date <= end,
            Order.end_date >= start,
        )
    )
    if exclude_order_id:
        q = q.filter(Order.id != exclude_order_id)
    return sum(i.qty or 1 for i in q.all())


def available_units(
    db: Session, product_id: int, start: date, end: date, exclude_order_id: Optional[int] = None
) -> List[Unit]:
    busy = busy_unit_ids(db, start, end, exclude_order_id)
    units = (
        db.query(Unit)
        .filter(
            Unit.product_id == product_id,
            Unit.is_active.is_(True),
            Unit.status.notin_([UnitStatus.retired, UnitStatus.maintenance, UnitStatus.sterilizing]),
        )
        .all()
    )
    return [u for u in units if u.id not in busy]


def availability(
    db: Session, product_id: int, start: date, end: date, exclude_order_id: Optional[int] = None
) -> Dict:
    units = available_units(db, product_id, start, end, exclude_order_id)
    total_units = (
        db.query(Unit)
        .filter(Unit.product_id == product_id, Unit.is_active.is_(True),
                Unit.status != UnitStatus.retired)
        .count()
    )
    reserved = reserved_qty_for_product(db, product_id, start, end, exclude_order_id)
    free = max(0, min(len(units), total_units - reserved))
    return {
        "product_id": product_id,
        "start": start.isoformat(),
        "end": end.isoformat(),
        "total_units": total_units,
        "available": free,
        "is_available": free > 0,
        "unit_ids": [u.id for u in units][:free] if free else [],
    }


def busy_days_map(db: Session, product_id: int, months_ahead: int = 3) -> List[str]:
    """
    قائمة التواريخ التي لا يوجد فيها أي وحدة متاحة — تُستخدم لتلوين التقويم.
    """
    today = date.today()
    horizon = today + timedelta(days=30 * months_ahead)
    total_units = (
        db.query(Unit)
        .filter(Unit.product_id == product_id, Unit.is_active.is_(True),
                Unit.status != UnitStatus.retired)
        .count()
    )
    if total_units == 0:
        return [(today + timedelta(days=i)).isoformat() for i in range((horizon - today).days + 1)]

    items = (
        db.query(OrderItem, Order)
        .join(Order, Order.id == OrderItem.order_id)
        .filter(
            OrderItem.product_id == product_id,
            Order.type == "rent",
            Order.status.in_([s for s in BLOCKING_STATUSES]),
            Order.start_date.isnot(None),
            Order.end_date.isnot(None),
            Order.end_date >= today,
            Order.start_date <= horizon,
        )
        .all()
    )
    counter: Dict[str, int] = {}
    for item, order in items:
        d = max(order.start_date, today)
        while d <= min(order.end_date, horizon):
            k = d.isoformat()
            counter[k] = counter.get(k, 0) + (item.qty or 1)
            d += timedelta(days=1)

    return sorted([k for k, v in counter.items() if v >= total_units])
