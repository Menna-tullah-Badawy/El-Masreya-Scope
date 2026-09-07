"""الصيانة والتعقيم والمعايرة"""
import random, string
from datetime import datetime, date, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (
    MaintenanceTicket, TicketStatus, TicketType, TicketPriority, Unit,
    UnitStatus, User, Notification,
)
from ..schemas import TicketIn, TicketOut, TicketUpdateIn
from ..security import require_admin
from ..serializers import ticket_out

router = APIRouter(prefix="/api/maintenance", tags=["maintenance"])


def _code() -> str:
    return f"TCK-{datetime.utcnow():%y%m}-" + "".join(random.choices(string.digits, k=5))


@router.get("/tickets", response_model=List[TicketOut])
def list_tickets(db: Session = Depends(get_db), _: User = Depends(require_admin),
                 status: Optional[str] = None, type: Optional[str] = None,
                 unit_id: Optional[int] = None):
    q = db.query(MaintenanceTicket)
    if status:
        q = q.filter(MaintenanceTicket.status == status)
    if type:
        q = q.filter(MaintenanceTicket.type == type)
    if unit_id:
        q = q.filter(MaintenanceTicket.unit_id == unit_id)
    return [ticket_out(t) for t in q.order_by(MaintenanceTicket.id.desc()).all()]


@router.post("/tickets", response_model=TicketOut)
def create_ticket(payload: TicketIn, db: Session = Depends(get_db),
                  _: User = Depends(require_admin)):
    unit = db.get(Unit, payload.unit_id)
    if not unit:
        raise HTTPException(404, "الوحدة غير موجودة")
    t = MaintenanceTicket(
        code=_code(), unit_id=unit.id, type=TicketType(payload.type),
        priority=TicketPriority(payload.priority), title=payload.title,
        description=payload.description, technician=payload.technician,
        cost=payload.cost, scheduled_at=payload.scheduled_at,
        next_due_at=payload.next_due_at,
    )
    db.add(t)
    if t.type == TicketType.sterilization:
        unit.status = UnitStatus.sterilizing
    else:
        unit.status = UnitStatus.maintenance
    db.commit(); db.refresh(t)
    return ticket_out(t)


@router.patch("/tickets/{tid}", response_model=TicketOut)
def update_ticket(tid: int, payload: TicketUpdateIn, db: Session = Depends(get_db),
                  _: User = Depends(require_admin)):
    t = db.get(MaintenanceTicket, tid)
    if not t:
        raise HTTPException(404, "التذكرة غير موجودة")
    data = payload.model_dump(exclude_unset=True)
    if "status" in data and data["status"]:
        t.status = TicketStatus(data.pop("status"))
        if t.status == TicketStatus.done:
            t.completed_at = datetime.utcnow()
            if t.unit:
                t.unit.status = UnitStatus.available
                t.unit.last_service_at = date.today()
                if t.next_due_at:
                    t.unit.next_service_due = t.next_due_at
        elif t.status == TicketStatus.cancelled and t.unit:
            t.unit.status = UnitStatus.available
    if "priority" in data and data["priority"]:
        t.priority = TicketPriority(data.pop("priority"))
    for k, v in data.items():
        if v is not None:
            setattr(t, k, v)
    db.commit(); db.refresh(t)
    return ticket_out(t)


@router.delete("/tickets/{tid}")
def delete_ticket(tid: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    t = db.get(MaintenanceTicket, tid)
    if not t:
        raise HTTPException(404, "التذكرة غير موجودة")
    db.delete(t); db.commit()
    return {"ok": True}


@router.get("/due")
def service_due(days: int = 30, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    """الوحدات التي اقترب أو فات موعد صيانتها الدورية."""
    limit = date.today() + timedelta(days=days)
    units = (db.query(Unit)
             .filter(Unit.is_active.is_(True), Unit.next_service_due.isnot(None),
                     Unit.next_service_due <= limit)
             .order_by(Unit.next_service_due).all())
    return [{
        "unit_id": u.id, "serial_number": u.serial_number,
        "product_name_ar": u.product.name_ar if u.product else "",
        "product_name_en": u.product.name_en if u.product else "",
        "next_service_due": u.next_service_due,
        "overdue": u.next_service_due < date.today(),
        "status": u.status.value,
    } for u in units]
