"""
توليد المستندات: فواتير PDF، عقود إيجار PDF، وأكواد QR للوحدات
Arabic-aware PDF generation (Amiri font + reshaper + bidi).
"""
import io
import random
import string
from datetime import datetime
from pathlib import Path

import arabic_reshaper
from bidi.algorithm import get_display
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage,
)
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models import Contract, Invoice, Order, OrderType, PaymentStatus, Unit, User, UserRole
from ..security import get_current_user

router = APIRouter(prefix="/api/docs", tags=["documents"])

FONT_DIR = Path(__file__).resolve().parent.parent / "fonts"
_FONTS_READY = False


def _ensure_fonts():
    global _FONTS_READY
    if _FONTS_READY:
        return
    pdfmetrics.registerFont(TTFont("Amiri", str(FONT_DIR / "Amiri-Regular.ttf")))
    pdfmetrics.registerFont(TTFont("Amiri-Bold", str(FONT_DIR / "Amiri-Bold.ttf")))
    _FONTS_READY = True


def ar(text) -> str:
    """تشكيل النص العربي ليظهر صحيحاً في PDF."""
    if text is None:
        return ""
    s = str(text)
    if not s:
        return ""
    try:
        return get_display(arabic_reshaper.reshape(s))
    except Exception:
        return s


BRAND = colors.HexColor("#0E7C86")
BRAND_DARK = colors.HexColor("#075E67")
LIGHT = colors.HexColor("#F1F7F8")


def _styles():
    return {
        "title": ParagraphStyle("t", fontName="Amiri-Bold", fontSize=20, alignment=2,
                                textColor=BRAND_DARK, leading=26),
        "h": ParagraphStyle("h", fontName="Amiri-Bold", fontSize=12, alignment=2,
                            textColor=BRAND_DARK, leading=18),
        "th": ParagraphStyle("th", fontName="Amiri-Bold", fontSize=10.5, alignment=1,
                             textColor=colors.white, leading=22, spaceBefore=2),
        "p": ParagraphStyle("p", fontName="Amiri", fontSize=10, alignment=2, leading=16),
        "pl": ParagraphStyle("pl", fontName="Amiri", fontSize=9, alignment=0, leading=14,
                             textColor=colors.HexColor("#5A6B70")),
        "small": ParagraphStyle("s", fontName="Amiri", fontSize=8.5, alignment=2,
                                leading=13, textColor=colors.HexColor("#5A6B70")),
    }


def _header(story, st, title_ar_txt, title_en_txt, number, dt):
    head = Table(
        [[Paragraph(f"<b>{title_en_txt}</b><br/>No: {number}<br/>"
                    f"Date: {dt:%Y-%m-%d}", st["pl"]),
          Paragraph(ar(settings.COMPANY_NAME_AR) + "<br/>" +
                    f'<font size="10">{settings.COMPANY_NAME_EN}</font>', st["title"])]],
        colWidths=[85 * mm, 85 * mm])
    head.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"),
                              ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]))
    story.append(head)
    story.append(Table([[""]], colWidths=[170 * mm], rowHeights=[2],
                       style=TableStyle([("BACKGROUND", (0, 0), (-1, -1), BRAND)])))
    story.append(Spacer(1, 6))
    story.append(Paragraph(ar(title_ar_txt), st["title"]))
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        ar(f"{settings.COMPANY_ADDRESS_AR} — هاتف: {settings.COMPANY_PHONE} — "
           f"{settings.COMPANY_EMAIL}"), st["small"]))
    story.append(Spacer(1, 10))


def _kv_table(rows, st, col=(55 * mm, 30 * mm)):
    data = []
    for k, v in rows:
        data.append([Paragraph(ar(str(v)), st["p"]), Paragraph(ar(str(k)), st["h"])])
    t = Table(data, colWidths=[col[0], col[1]], hAlign="RIGHT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (1, 0), (1, -1), LIGHT),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#D8E4E6")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return t


def _money(v) -> str:
    return f"{float(v or 0):,.2f} {settings.CURRENCY_AR}"


def _guard(order: Order, user: User):
    if user.role != UserRole.admin and order.user_id != user.id:
        raise HTTPException(403, "غير مصرح")


# ---------------------------------------------------------------- invoice
@router.get("/invoice/{order_id}.pdf")
def invoice_pdf(order_id: int, db: Session = Depends(get_db),
                user: User = Depends(get_current_user)):
    _ensure_fonts()
    o = db.get(Order, order_id)
    if not o:
        raise HTTPException(404, "الطلب غير موجود")
    _guard(o, user)

    inv = o.invoice
    if not inv:
        inv = Invoice(order_id=o.id, total=o.total or 0,
                      number=f"INV-{datetime.utcnow():%y%m}-" +
                             "".join(random.choices(string.digits, k=5)))
        db.add(inv); db.commit(); db.refresh(inv)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, rightMargin=20 * mm, leftMargin=20 * mm,
                            topMargin=15 * mm, bottomMargin=15 * mm)
    st = _styles()
    story = []
    _header(story, st, "فاتورة ضريبية مبسطة", "INVOICE", inv.number, inv.issued_at)

    kind = "إيجار" if o.type == OrderType.rent else "بيع"
    info = [("رقم الطلب", o.code), ("النوع", kind),
            ("العميل", o.user.name if o.user else ""),
            ("الهاتف", o.contact_phone or (o.user.phone if o.user else "")),
            ("العنوان", (o.delivery_address or "-")[:60])]
    if o.type == OrderType.rent:
        info += [("من تاريخ", o.start_date), ("إلى تاريخ", o.end_date),
                 ("عدد الأيام", o.days)]
    story.append(_kv_table(info, st))
    story.append(Spacer(1, 12))

    head = [Paragraph(ar("الإجمالي"), st["th"]), Paragraph(ar("التأمين"), st["th"]),
            Paragraph(ar("السعر"), st["th"]), Paragraph(ar("الكمية"), st["th"]),
            Paragraph("Serial No.", st["th"]), Paragraph(ar("الصنف"), st["th"])]
    rows = [head]
    for i in o.items:
        bd = i.pricing_breakdown or {}
        note = ""
        if o.type == OrderType.rent and bd:
            parts = []
            if bd.get("months"): parts.append(f"{bd['months']} شهر")
            if bd.get("weeks"): parts.append(f"{bd['weeks']} أسبوع")
            if bd.get("days"): parts.append(f"{bd['days']} يوم")
            note = " + ".join(parts)
        name = (i.product.name_ar if i.product else "") + (f"\n({note})" if note else "")
        rows.append([
            Paragraph(ar(_money(i.line_total)), st["p"]),
            Paragraph(ar(_money((i.deposit or 0) * (i.qty or 1))), st["p"]),
            Paragraph(ar(_money(i.unit_price)), st["p"]),
            Paragraph(ar(str(i.qty or 1)), st["p"]),
            Paragraph(i.unit.serial_number if i.unit else "-", st["pl"]),
            Paragraph(ar(name), st["p"]),
        ])
    t = Table(rows, colWidths=[27 * mm, 25 * mm, 27 * mm, 15 * mm, 28 * mm, 48 * mm],
              rowHeights=[13 * mm] + [None] * (len(rows) - 1))
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#D8E4E6")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT]),
        ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(t)
    story.append(Spacer(1, 12))

    paid = sum(p.amount for p in o.payments if p.status == PaymentStatus.paid)
    totals = [("الإجمالي الفرعي", _money(o.subtotal)),
              ("مبلغ التأمين (مسترد)", _money(o.deposit_total)),
              ("رسوم التوصيل", _money(o.delivery_fee)),
              ("غرامة التأخير", _money(o.late_fee_total)),
              ("الخصم", "- " + _money(o.discount)),
              ("الإجمالي المستحق", _money(o.total)),
              ("المدفوع", _money(paid)),
              ("المتبقي", _money(max(0, (o.total or 0) - paid)))]
    tt = _kv_table(totals, st, col=(45 * mm, 45 * mm))
    tt.setStyle(TableStyle([("BACKGROUND", (0, 5), (-1, 5), colors.HexColor("#DCEEF0")),
                            ("FONTNAME", (0, 5), (-1, 5), "Amiri-Bold")]))
    story.append(tt)
    story.append(Spacer(1, 14))

    pm = "كاش عند الاستلام" if o.payment_method.value == "cash_on_delivery" else "بطاقة (Stripe)"
    story.append(Paragraph(ar(f"طريقة الدفع: {pm} — حالة الدفع: {o.payment_status.value}"), st["p"]))
    story.append(Spacer(1, 6))
    story.append(Paragraph(ar("مبلغ التأمين يُرد بالكامل عند إرجاع الجهاز بحالته السليمة."),
                           st["small"]))
    story.append(Spacer(1, 18))
    story.append(Paragraph(ar(f"شكراً لتعاملكم مع {settings.COMPANY_NAME_AR} — "
                              f"واتساب: {settings.COMPANY_PHONE}"), st["small"]))

    doc.build(story)
    buf.seek(0)
    return StreamingResponse(
        buf, media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{inv.number}.pdf"'})


# --------------------------------------------------------------- contract
TERMS_AR = [
    "يلتزم المستأجر باستخدام الجهاز في الغرض الطبي المخصص له وبواسطة كادر مؤهل فقط.",
    "الجهاز مُسلَّم بحالة سليمة ومعقّم، ويلتزم المستأجر بإعادته بنفس الحالة.",
    "مبلغ التأمين مسترد بالكامل عند الإرجاع سليماً وفي الموعد المتفق عليه.",
    "في حالة التأخير عن موعد الإرجاع تُحتسب غرامة يومية حسب التعريفة الموضحة بالفاتورة.",
    "أي تلف أو فقد يتحمل المستأجر قيمة الإصلاح أو الاستبدال بسعر السوق.",
    "لا يجوز تأجير الجهاز من الباطن أو نقله لجهة أخرى دون موافقة كتابية.",
    "تلتزم الشركة بصيانة الجهاز واستبداله خلال 24 ساعة حال وجود عطل غير ناتج عن سوء الاستخدام.",
    "يخضع هذا العقد لأحكام القانون المصري، وتختص محاكم الجيزة بأي نزاع.",
]


@router.get("/contract/{order_id}.pdf")
def contract_pdf(order_id: int, db: Session = Depends(get_db),
                 user: User = Depends(get_current_user)):
    _ensure_fonts()
    o = db.get(Order, order_id)
    if not o:
        raise HTTPException(404, "الطلب غير موجود")
    _guard(o, user)
    if o.type != OrderType.rent:
        raise HTTPException(400, "العقد متاح لطلبات الإيجار فقط")

    c = db.query(Contract).filter(Contract.order_id == o.id).first()
    if not c:
        c = Contract(order_id=o.id, signed_by=o.contact_name or "",
                     number=f"CTR-{datetime.utcnow():%y%m}-" +
                            "".join(random.choices(string.digits, k=5)))
        db.add(c); db.commit(); db.refresh(c)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, rightMargin=20 * mm, leftMargin=20 * mm,
                            topMargin=15 * mm, bottomMargin=15 * mm)
    st = _styles()
    story = []
    _header(story, st, "عقد إيجار أجهزة طبية", "EQUIPMENT RENTAL AGREEMENT",
            c.number, c.created_at)

    story.append(Paragraph(ar("الطرف الأول (المؤجر)"), st["h"]))
    story.append(_kv_table([("الاسم", settings.COMPANY_NAME_AR),
                            ("العنوان", settings.COMPANY_ADDRESS_AR),
                            ("الهاتف", settings.COMPANY_PHONE)], st))
    story.append(Spacer(1, 8))
    story.append(Paragraph(ar("الطرف الثاني (المستأجر)"), st["h"]))
    story.append(_kv_table([("الاسم", o.user.name if o.user else ""),
                            ("الجهة", (o.user.organization or "-") if o.user else "-"),
                            ("الهاتف", o.contact_phone or ""),
                            ("العنوان", (o.delivery_address or "-")[:70])], st))
    story.append(Spacer(1, 10))

    story.append(Paragraph(ar("بيانات الإيجار"), st["h"]))
    story.append(_kv_table([("رقم الطلب", o.code),
                            ("من", o.start_date), ("إلى", o.end_date),
                            ("عدد الأيام", o.days),
                            ("قيمة الإيجار", _money(o.subtotal)),
                            ("التأمين", _money(o.deposit_total)),
                            ("الإجمالي", _money(o.total))], st))
    story.append(Spacer(1, 10))

    story.append(Paragraph(ar("الأجهزة المؤجرة"), st["h"]))
    rows = [[Paragraph(ar("الكمية"), st["th"]), Paragraph("Serial No.", st["th"]),
             Paragraph(ar("الجهاز"), st["th"])]]
    for i in o.items:
        rows.append([Paragraph(ar(str(i.qty or 1)), st["p"]),
                     Paragraph(i.unit.serial_number if i.unit else "—", st["pl"]),
                     Paragraph(ar(i.product.name_ar if i.product else ""), st["p"])])
    t = Table(rows, colWidths=[20 * mm, 55 * mm, 95 * mm],
              rowHeights=[13 * mm] + [None] * (len(rows) - 1))
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), BRAND),
                           ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                           ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#D8E4E6")),
                           ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                           ("TOPPADDING", (0, 0), (-1, -1), 5),
                           ("BOTTOMPADDING", (0, 0), (-1, -1), 5)]))
    story.append(t)
    story.append(Spacer(1, 12))

    story.append(Paragraph(ar("الشروط والأحكام"), st["h"]))
    for idx, term in enumerate(TERMS_AR, 1):
        story.append(Paragraph(ar(f"{idx}. {term}"), st["p"]))
        story.append(Spacer(1, 2))
    story.append(Spacer(1, 22))

    sign = Table([[Paragraph(ar("توقيع الطرف الثاني (المستأجر)\n\n\n............................"),
                             st["p"]),
                   Paragraph(ar("توقيع الطرف الأول (المؤجر)\n\n\n............................"),
                             st["p"])]], colWidths=[85 * mm, 85 * mm])
    sign.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    story.append(sign)

    doc.build(story)
    buf.seek(0)
    return StreamingResponse(
        buf, media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{c.number}.pdf"'})


# ------------------------------------------------------------------- QR
@router.get("/unit-qr/{unit_id}.png")
def unit_qr(unit_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role != UserRole.admin:
        raise HTTPException(403, "للمدير فقط")
    u = db.get(Unit, unit_id)
    if not u:
        raise HTTPException(404, "الوحدة غير موجودة")
    import qrcode
    payload = (f"SCOPE-EG|unit:{u.id}|sn:{u.serial_number}|"
               f"product:{u.product.name_en if u.product else ''}")
    img = qrcode.make(payload)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png",
                             headers={"Content-Disposition":
                                      f'inline; filename="unit-{u.serial_number}.png"'})


@router.get("/unit-label/{unit_id}.pdf")
def unit_label(unit_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """ملصق أصول للطباعة يحتوي على QR والرقم التسلسلي."""
    _ensure_fonts()
    if user.role != UserRole.admin:
        raise HTTPException(403, "للمدير فقط")
    u = db.get(Unit, unit_id)
    if not u:
        raise HTTPException(404, "الوحدة غير موجودة")
    import qrcode
    payload = f"SCOPE-EG|unit:{u.id}|sn:{u.serial_number}"
    qbuf = io.BytesIO()
    qrcode.make(payload).save(qbuf, format="PNG")
    qbuf.seek(0)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=(90 * mm, 55 * mm),
                            rightMargin=5 * mm, leftMargin=5 * mm,
                            topMargin=4 * mm, bottomMargin=4 * mm)
    st = _styles()
    story = [Table([[RLImage(qbuf, width=32 * mm, height=32 * mm),
                     Paragraph(ar(settings.COMPANY_NAME_AR) + "<br/>" +
                               f'<font size="8">{settings.COMPANY_NAME_EN}</font><br/><br/>' +
                               ar(u.product.name_ar if u.product else "") + "<br/>" +
                               f'<font size="9">SN: {u.serial_number}</font>', st["p"])]],
                   colWidths=[34 * mm, 46 * mm],
                   style=TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE")]))]
    doc.build(story)
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/pdf",
                             headers={"Content-Disposition":
                                      f'inline; filename="label-{u.serial_number}.pdf"'})
