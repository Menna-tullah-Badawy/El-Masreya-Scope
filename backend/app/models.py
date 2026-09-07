"""
نماذج قاعدة البيانات - SCOPE Egypt
Database models for the medical equipment rental & sales platform.
"""
import enum
from datetime import datetime, date

from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean, DateTime, Date,
    ForeignKey, Enum as SAEnum, JSON, UniqueConstraint, Index,
)
from sqlalchemy.orm import relationship

from .database import Base


# ---------------------------------------------------------------- enums
class UserRole(str, enum.Enum):
    admin = "admin"
    customer = "customer"


class UnitStatus(str, enum.Enum):
    available = "available"        # متاح
    reserved = "reserved"          # محجوز
    rented = "rented"              # مؤجر حالياً
    maintenance = "maintenance"    # في الصيانة
    sterilizing = "sterilizing"    # في التعقيم
    retired = "retired"            # خارج الخدمة


class OrderType(str, enum.Enum):
    rent = "rent"
    sale = "sale"


class OrderStatus(str, enum.Enum):
    pending = "pending"        # بانتظار موافقة الإدارة
    approved = "approved"      # تمت الموافقة
    rejected = "rejected"      # مرفوض
    active = "active"          # جارٍ (تم التسليم)
    returned = "returned"      # تم الاسترجاع
    completed = "completed"    # منتهي
    cancelled = "cancelled"    # ملغي


class PaymentMethod(str, enum.Enum):
    cash_on_delivery = "cash_on_delivery"
    stripe = "stripe"


class PaymentStatus(str, enum.Enum):
    unpaid = "unpaid"
    pending = "pending"
    paid = "paid"
    refunded = "refunded"
    failed = "failed"


class PricingMode(str, enum.Enum):
    daily = "daily"
    weekly = "weekly"
    monthly = "monthly"
    sale = "sale"


class TicketType(str, enum.Enum):
    maintenance = "maintenance"      # صيانة
    sterilization = "sterilization"  # تعقيم
    calibration = "calibration"      # معايرة
    inspection = "inspection"        # فحص دوري


class TicketStatus(str, enum.Enum):
    open = "open"
    in_progress = "in_progress"
    done = "done"
    cancelled = "cancelled"


class TicketPriority(str, enum.Enum):
    low = "low"
    normal = "normal"
    high = "high"
    urgent = "urgent"


# ---------------------------------------------------------------- models
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    name = Column(String(160), nullable=False)
    email = Column(String(180), unique=True, nullable=False, index=True)
    phone = Column(String(40), nullable=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole), default=UserRole.customer, nullable=False)
    organization = Column(String(180), nullable=True)   # اسم المستشفى/العيادة
    address = Column(Text, nullable=True)
    city = Column(String(80), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    orders = relationship("Order", back_populates="user", cascade="all,delete")
    reviews = relationship("Review", back_populates="user", cascade="all,delete")
    notifications = relationship("Notification", back_populates="user", cascade="all,delete")


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True)
    slug = Column(String(80), unique=True, nullable=False, index=True)
    name_ar = Column(String(140), nullable=False)
    name_en = Column(String(140), nullable=False)
    description_ar = Column(Text, default="")
    description_en = Column(Text, default="")
    icon = Column(String(16), default="🩺")
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)

    products = relationship("Product", back_populates="category")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True)
    sku = Column(String(60), unique=True, nullable=False, index=True)
    slug = Column(String(160), unique=True, nullable=False, index=True)
    name_ar = Column(String(200), nullable=False)
    name_en = Column(String(200), nullable=False)
    brand = Column(String(120), default="")
    model = Column(String(120), default="")
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)

    short_ar = Column(String(400), default="")
    short_en = Column(String(400), default="")
    description_ar = Column(Text, default="")
    description_en = Column(Text, default="")

    image = Column(String(400), default="")
    images = Column(JSON, default=list)
    specs = Column(JSON, default=list)   # [{"key_ar","key_en","value_ar","value_en"}]

    # التوافر
    is_for_rent = Column(Boolean, default=True)
    is_for_sale = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)

    # التسعير
    sale_price = Column(Float, default=0.0)
    rent_daily = Column(Float, default=0.0)
    rent_weekly = Column(Float, default=0.0)
    rent_monthly = Column(Float, default=0.0)
    deposit = Column(Float, default=0.0)          # مبلغ التأمين المسترد
    late_fee_per_day = Column(Float, default=0.0)  # غرامة التأخير اليومية

    min_rent_days = Column(Integer, default=1)
    requires_training = Column(Boolean, default=False)
    warranty_months = Column(Integer, default=0)

    rating_avg = Column(Float, default=0.0)
    rating_count = Column(Integer, default=0)
    views = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)

    category = relationship("Category", back_populates="products")
    units = relationship("Unit", back_populates="product", cascade="all,delete")
    reviews = relationship("Review", back_populates="product", cascade="all,delete")


class Unit(Base):
    """وحدة فعلية من الجهاز يتم تتبعها بالرقم التسلسلي."""
    __tablename__ = "units"
    __table_args__ = (UniqueConstraint("serial_number", name="uq_unit_serial"),)

    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    serial_number = Column(String(120), nullable=False, index=True)
    asset_tag = Column(String(60), default="")
    status = Column(SAEnum(UnitStatus), default=UnitStatus.available, nullable=False)
    condition_note = Column(Text, default="")
    purchase_date = Column(Date, nullable=True)
    purchase_cost = Column(Float, default=0.0)
    location = Column(String(120), default="المخزن الرئيسي")
    last_service_at = Column(Date, nullable=True)
    next_service_due = Column(Date, nullable=True)
    total_rentals = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product", back_populates="units")
    order_items = relationship("OrderItem", back_populates="unit")
    tickets = relationship("MaintenanceTicket", back_populates="unit", cascade="all,delete")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True)
    code = Column(String(30), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(SAEnum(OrderType), nullable=False)
    status = Column(SAEnum(OrderStatus), default=OrderStatus.pending, nullable=False)

    start_date = Column(Date, nullable=True)   # للإيجار
    end_date = Column(Date, nullable=True)
    days = Column(Integer, default=0)
    actual_return_date = Column(Date, nullable=True)

    subtotal = Column(Float, default=0.0)
    deposit_total = Column(Float, default=0.0)
    late_fee_total = Column(Float, default=0.0)
    discount = Column(Float, default=0.0)
    delivery_fee = Column(Float, default=0.0)
    total = Column(Float, default=0.0)

    payment_method = Column(SAEnum(PaymentMethod), default=PaymentMethod.cash_on_delivery)
    payment_status = Column(SAEnum(PaymentStatus), default=PaymentStatus.unpaid)

    contact_name = Column(String(160), default="")
    contact_phone = Column(String(40), default="")
    delivery_address = Column(Text, default="")
    notes = Column(Text, default="")
    admin_note = Column(Text, default="")

    created_at = Column(DateTime, default=datetime.utcnow)
    approved_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all,delete")
    payments = relationship("Payment", back_populates="order", cascade="all,delete")
    invoice = relationship("Invoice", back_populates="order", uselist=False, cascade="all,delete")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    unit_id = Column(Integer, ForeignKey("units.id"), nullable=True)  # يخصصه المدير

    qty = Column(Integer, default=1)
    pricing_mode = Column(SAEnum(PricingMode), default=PricingMode.daily)
    pricing_breakdown = Column(JSON, default=dict)  # {"months":1,"weeks":0,"days":3}
    unit_price = Column(Float, default=0.0)   # السعر المحسوب للوحدة الواحدة كامل المدة
    deposit = Column(Float, default=0.0)
    line_total = Column(Float, default=0.0)

    returned_at = Column(DateTime, nullable=True)
    return_condition = Column(Text, default="")

    order = relationship("Order", back_populates="items")
    product = relationship("Product")
    unit = relationship("Unit", back_populates="order_items")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    amount = Column(Float, nullable=False)
    method = Column(SAEnum(PaymentMethod), default=PaymentMethod.cash_on_delivery)
    status = Column(SAEnum(PaymentStatus), default=PaymentStatus.paid)
    reference = Column(String(160), default="")
    note = Column(String(300), default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    order = relationship("Order", back_populates="payments")


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id"), unique=True, nullable=False)
    number = Column(String(40), unique=True, nullable=False, index=True)
    issued_at = Column(DateTime, default=datetime.utcnow)
    total = Column(Float, default=0.0)
    notes = Column(Text, default="")

    order = relationship("Order", back_populates="invoice")


class Contract(Base):
    """عقد إيجار مرتبط بطلب."""
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id"), unique=True, nullable=False)
    number = Column(String(40), unique=True, nullable=False, index=True)
    signed_by = Column(String(160), default="")
    signed_at = Column(DateTime, nullable=True)
    terms_ar = Column(Text, default="")
    terms_en = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    order = relationship("Order")


class MaintenanceTicket(Base):
    __tablename__ = "maintenance_tickets"

    id = Column(Integer, primary_key=True)
    code = Column(String(30), unique=True, nullable=False, index=True)
    unit_id = Column(Integer, ForeignKey("units.id"), nullable=False)
    type = Column(SAEnum(TicketType), default=TicketType.maintenance)
    status = Column(SAEnum(TicketStatus), default=TicketStatus.open)
    priority = Column(SAEnum(TicketPriority), default=TicketPriority.normal)

    title = Column(String(200), nullable=False)
    description = Column(Text, default="")
    technician = Column(String(160), default="")
    cost = Column(Float, default=0.0)

    scheduled_at = Column(Date, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    next_due_at = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    unit = relationship("Unit", back_populates="tickets")


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (Index("ix_review_product", "product_id"),)

    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rating = Column(Integer, nullable=False)  # 1..5
    comment = Column(Text, default="")
    is_approved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product", back_populates="reviews")
    user = relationship("User", back_populates="reviews")


class Post(Base):
    """مقالات / مدونة"""
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True)
    slug = Column(String(200), unique=True, nullable=False, index=True)
    title_ar = Column(String(250), nullable=False)
    title_en = Column(String(250), nullable=False)
    excerpt_ar = Column(String(500), default="")
    excerpt_en = Column(String(500), default="")
    body_ar = Column(Text, default="")
    body_en = Column(Text, default="")
    cover = Column(String(400), default="")
    author = Column(String(160), default="SCOPE Egypt")
    tags = Column(JSON, default=list)
    is_published = Column(Boolean, default=True)
    published_at = Column(DateTime, default=datetime.utcnow)
    views = Column(Integer, default=0)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # null = للإدارة
    for_admin = Column(Boolean, default=False)
    title_ar = Column(String(200), default="")
    title_en = Column(String(200), default="")
    body_ar = Column(Text, default="")
    body_en = Column(Text, default="")
    level = Column(String(20), default="info")  # info | success | warning | danger
    link = Column(String(200), default="")
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")


class Setting(Base):
    __tablename__ = "settings"

    key = Column(String(80), primary_key=True)
    value = Column(Text, default="")
