"""Pydantic schemas"""
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, EmailStr, Field, ConfigDict


class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ------------------------------------------------------------------ auth
class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    email: EmailStr
    phone: Optional[str] = ""
    password: str = Field(min_length=6, max_length=128)
    organization: Optional[str] = ""
    city: Optional[str] = ""
    address: Optional[str] = ""


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(ORMBase):
    id: int
    name: str
    email: str
    phone: Optional[str] = ""
    role: str
    organization: Optional[str] = ""
    city: Optional[str] = ""
    address: Optional[str] = ""
    is_active: bool
    created_at: datetime


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UserUpdateIn(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    organization: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    password: Optional[str] = None


# ------------------------------------------------------------ categories
class CategoryIn(BaseModel):
    slug: str
    name_ar: str
    name_en: str
    description_ar: str = ""
    description_en: str = ""
    icon: str = "🩺"
    sort_order: int = 0
    is_active: bool = True


class CategoryOut(ORMBase):
    id: int
    slug: str
    name_ar: str
    name_en: str
    description_ar: str = ""
    description_en: str = ""
    icon: str = "🩺"
    sort_order: int = 0
    is_active: bool = True
    product_count: int = 0


# -------------------------------------------------------------- products
class SpecItem(BaseModel):
    key_ar: str = ""
    key_en: str = ""
    value_ar: str = ""
    value_en: str = ""


class ProductIn(BaseModel):
    sku: str
    slug: str
    name_ar: str
    name_en: str
    brand: str = ""
    model: str = ""
    category_id: int
    short_ar: str = ""
    short_en: str = ""
    description_ar: str = ""
    description_en: str = ""
    image: str = ""
    images: List[str] = []
    specs: List[SpecItem] = []
    is_for_rent: bool = True
    is_for_sale: bool = False
    is_active: bool = True
    is_featured: bool = False
    sale_price: float = 0
    rent_daily: float = 0
    rent_weekly: float = 0
    rent_monthly: float = 0
    deposit: float = 0
    late_fee_per_day: float = 0
    min_rent_days: int = 1
    requires_training: bool = False
    warranty_months: int = 0


class ProductOut(ORMBase):
    id: int
    sku: str
    slug: str
    name_ar: str
    name_en: str
    brand: str = ""
    model: str = ""
    category_id: int
    category_name_ar: str = ""
    category_name_en: str = ""
    short_ar: str = ""
    short_en: str = ""
    description_ar: str = ""
    description_en: str = ""
    image: str = ""
    images: List[str] = []
    specs: List[Dict[str, Any]] = []
    is_for_rent: bool
    is_for_sale: bool
    is_active: bool
    is_featured: bool
    sale_price: float
    rent_daily: float
    rent_weekly: float
    rent_monthly: float
    deposit: float
    late_fee_per_day: float
    min_rent_days: int
    requires_training: bool
    warranty_months: int
    rating_avg: float
    rating_count: int
    units_total: int = 0
    units_available: int = 0


# ----------------------------------------------------------------- units
class UnitIn(BaseModel):
    product_id: int
    serial_number: str
    asset_tag: str = ""
    status: str = "available"
    condition_note: str = ""
    purchase_date: Optional[date] = None
    purchase_cost: float = 0
    location: str = "المخزن الرئيسي"
    next_service_due: Optional[date] = None
    is_active: bool = True


class UnitOut(ORMBase):
    id: int
    product_id: int
    product_name_ar: str = ""
    product_name_en: str = ""
    serial_number: str
    asset_tag: str = ""
    status: str
    condition_note: str = ""
    purchase_date: Optional[date] = None
    purchase_cost: float = 0
    location: str = ""
    last_service_at: Optional[date] = None
    next_service_due: Optional[date] = None
    total_rentals: int = 0
    is_active: bool = True


# ---------------------------------------------------------------- orders
class OrderItemIn(BaseModel):
    product_id: int
    qty: int = 1


class OrderIn(BaseModel):
    type: str = "rent"                    # rent | sale
    items: List[OrderItemIn]
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    payment_method: str = "cash_on_delivery"
    contact_name: str = ""
    contact_phone: str = ""
    delivery_address: str = ""
    notes: str = ""


class OrderItemOut(ORMBase):
    id: int
    product_id: int
    product_name_ar: str = ""
    product_name_en: str = ""
    product_image: str = ""
    unit_id: Optional[int] = None
    unit_serial: Optional[str] = None
    qty: int
    pricing_mode: str
    pricing_breakdown: Dict[str, Any] = {}
    unit_price: float
    deposit: float
    line_total: float
    returned_at: Optional[datetime] = None


class OrderOut(ORMBase):
    id: int
    code: str
    user_id: int
    customer_name: str = ""
    customer_phone: str = ""
    type: str
    status: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    days: int = 0
    actual_return_date: Optional[date] = None
    subtotal: float
    deposit_total: float
    late_fee_total: float
    discount: float
    delivery_fee: float
    total: float
    payment_method: str
    payment_status: str
    contact_name: str = ""
    contact_phone: str = ""
    delivery_address: str = ""
    notes: str = ""
    admin_note: str = ""
    created_at: datetime
    approved_at: Optional[datetime] = None
    items: List[OrderItemOut] = []
    invoice_number: Optional[str] = None
    amount_paid: float = 0
    amount_due: float = 0


class OrderStatusIn(BaseModel):
    status: str
    admin_note: str = ""
    discount: Optional[float] = None
    delivery_fee: Optional[float] = None


class AssignUnitIn(BaseModel):
    item_id: int
    unit_id: int


class ReturnIn(BaseModel):
    actual_return_date: Optional[date] = None
    condition_note: str = ""
    send_to_sterilization: bool = True


class PaymentIn(BaseModel):
    amount: float
    method: str = "cash_on_delivery"
    reference: str = ""
    note: str = ""


# ------------------------------------------------------------ maintenance
class TicketIn(BaseModel):
    unit_id: int
    type: str = "maintenance"
    priority: str = "normal"
    title: str
    description: str = ""
    technician: str = ""
    cost: float = 0
    scheduled_at: Optional[date] = None
    next_due_at: Optional[date] = None


class TicketUpdateIn(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    technician: Optional[str] = None
    cost: Optional[float] = None
    description: Optional[str] = None
    scheduled_at: Optional[date] = None
    next_due_at: Optional[date] = None


class TicketOut(ORMBase):
    id: int
    code: str
    unit_id: int
    unit_serial: str = ""
    product_name_ar: str = ""
    product_name_en: str = ""
    type: str
    status: str
    priority: str
    title: str
    description: str = ""
    technician: str = ""
    cost: float = 0
    scheduled_at: Optional[date] = None
    completed_at: Optional[datetime] = None
    next_due_at: Optional[date] = None
    created_at: datetime


# --------------------------------------------------------------- reviews
class ReviewIn(BaseModel):
    product_id: int
    rating: int = Field(ge=1, le=5)
    comment: str = ""


class ReviewOut(ORMBase):
    id: int
    product_id: int
    product_name_ar: str = ""
    user_id: int
    user_name: str = ""
    rating: int
    comment: str = ""
    is_approved: bool
    created_at: datetime


# ------------------------------------------------------------------ blog
class PostIn(BaseModel):
    slug: str
    title_ar: str
    title_en: str
    excerpt_ar: str = ""
    excerpt_en: str = ""
    body_ar: str = ""
    body_en: str = ""
    cover: str = ""
    author: str = "SCOPE Egypt"
    tags: List[str] = []
    is_published: bool = True


class PostOut(ORMBase):
    id: int
    slug: str
    title_ar: str
    title_en: str
    excerpt_ar: str = ""
    excerpt_en: str = ""
    body_ar: str = ""
    body_en: str = ""
    cover: str = ""
    author: str = ""
    tags: List[str] = []
    is_published: bool
    published_at: datetime
    views: int = 0


# --------------------------------------------------------- notifications
class NotificationOut(ORMBase):
    id: int
    title_ar: str = ""
    title_en: str = ""
    body_ar: str = ""
    body_en: str = ""
    level: str = "info"
    link: str = ""
    is_read: bool = False
    created_at: datetime


# --------------------------------------------------------------- quoting
class QuoteIn(BaseModel):
    product_id: int
    start_date: date
    end_date: date
    qty: int = 1
