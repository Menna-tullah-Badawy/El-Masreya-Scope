"""
بيانات أولية واقعية — SCOPE Egypt
تشغيل:  python -m app.seed        (أضف --reset لمسح البيانات وإعادة البناء)
"""
import random
import string
import sys
from datetime import date, datetime, timedelta

from sqlalchemy import text

from .database import Base, SessionLocal, engine
from .models import (
    Category, Contract, Invoice, MaintenanceTicket, Notification, Order, OrderItem,
    OrderStatus, OrderType, Payment, PaymentMethod, PaymentStatus, Post, PricingMode,
    Product, Review, Setting, TicketPriority, TicketStatus, TicketType, Unit,
    UnitStatus, User, UserRole,
)
from .pricing import best_rent_price, date_span_days
from .security import hash_password

IMG = "https://images.unsplash.com/"


def img_url(v: str) -> str:
    """Local /uploads/... paths pass through; bare unsplash ids get the CDN prefix."""
    return v if v.startswith(("/", "http")) else IMG + v


def code(prefix):
    return f"{prefix}-{datetime.utcnow():%y%m}-" + "".join(random.choices(string.digits, k=5))


CATEGORIES = [
    dict(slug="endoscopes", name_ar="المناظير الطبية", name_en="Endoscopes", icon="🔬",
         description_ar="مناظير الجهاز الهضمي والقولون والمفاصل والأنف والأذن",
         description_en="GI, colonoscopy, arthroscopy and ENT endoscopes", sort_order=1),
    dict(slug="towers", name_ar="أبراج ووحدات التنظير", name_en="Endoscopy Towers", icon="🖥️",
         description_ar="أبراج متكاملة تشمل الكاميرا والشاشة ومصدر الإضاءة",
         description_en="Complete towers: camera, monitor and light source", sort_order=2),
    dict(slug="or-equipment", name_ar="أجهزة العمليات", name_en="Operating Room", icon="⚕️",
         description_ar="أجهزة الكي الجراحي وطاولات العمليات وأجهزة التخدير",
         description_en="Electrosurgery, OR tables and anesthesia machines", sort_order=3),
    dict(slug="monitoring", name_ar="أجهزة المراقبة", name_en="Patient Monitoring", icon="📈",
         description_ar="مراقبة العلامات الحيوية وتخطيط القلب",
         description_en="Vital signs monitors and ECG", sort_order=4),
    dict(slug="respiratory", name_ar="أجهزة التنفس والأكسجين", name_en="Respiratory & Oxygen",
         icon="🫁", description_ar="مولدات أكسجين، أجهزة تنفس صناعي، بخاخات",
         description_en="Oxygen concentrators, ventilators, nebulizers", sort_order=5),
    dict(slug="home-care", name_ar="الرعاية المنزلية", name_en="Home Care", icon="🏠",
         description_ar="أسرّة طبية، مراتب هوائية، كراسي متحركة، رافعات مرضى",
         description_en="Hospital beds, air mattresses, wheelchairs, patient lifts",
         sort_order=6),
    dict(slug="sterilization", name_ar="التعقيم والتنظيف", name_en="Sterilization", icon="🧼",
         description_ar="أوتوكلاف وأجهزة غسيل وتعقيم المناظير",
         description_en="Autoclaves and endoscope reprocessors", sort_order=7),
]

# (sku, slug, ar, en, brand, model, cat, daily, weekly, monthly, deposit, late, sale, forsale, feat, img, short_ar, short_en, specs)
PRODUCTS = [
    ("SC-END-001", "olympus-cv-170-gastroscope", "منظار معدة أوليمبوس CV-170",
     "Olympus CV-170 Gastroscope", "Olympus", "GIF-H170", "endoscopes",
     1800, 10500, 36000, 15000, 350, 0, False, True,
     "/uploads/p-gastroscope.jpg",
     "منظار معدة عالي الدقة HD مع قناة عمل 2.8 مم — معقّم وجاهز للاستخدام",
     "HD gastroscope with 2.8mm working channel — sterilized and ready",
     [("الدقة", "Resolution", "HD 1080p", "HD 1080p"),
      ("قطر الأنبوب", "Insertion tube", "9.2 مم", "9.2 mm"),
      ("قناة العمل", "Working channel", "2.8 مم", "2.8 mm"),
      ("زاوية الرؤية", "Field of view", "140°", "140°")]),

    ("SC-END-002", "pentax-colonoscope-ec38", "منظار قولون بنتاكس EC38-i10",
     "Pentax EC38-i10 Colonoscope", "Pentax", "EC38-i10", "endoscopes",
     2100, 12000, 41000, 18000, 400, 0, False, True,
     "/uploads/p-colonoscope.jpg",
     "منظار قولون مرن بطول 1500 مم مع تقنية i-scan لتحسين الرؤية",
     "1500mm flexible colonoscope with i-scan image enhancement",
     [("الطول العامل", "Working length", "1500 مم", "1500 mm"),
      ("قطر الأنبوب", "Insertion tube", "11.6 مم", "11.6 mm"),
      ("قناة العمل", "Working channel", "3.8 مم", "3.8 mm"),
      ("الانحناء", "Angulation", "180°/180°", "180°/180°")]),

    ("SC-END-003", "stryker-arthroscope-4mm", "منظار مفاصل ستريكر 4 مم",
     "Stryker 4mm Arthroscope 30°", "Stryker", "502-540-030", "endoscopes",
     1400, 8200, 28000, 12000, 300, 145000, True, True,
     "/uploads/p-arthroscope.jpg",
     "منظار مفاصل صلب 4 مم بزاوية 30° للركبة والكتف",
     "Rigid 4mm 30° arthroscope for knee and shoulder procedures",
     [("القطر", "Diameter", "4 مم", "4 mm"),
      ("الزاوية", "Angle", "30°", "30°"),
      ("الطول", "Length", "175 مم", "175 mm"),
      ("التعقيم", "Sterilization", "أوتوكلاف", "Autoclavable")]),

    ("SC-END-004", "karl-storz-hopkins-ent", "منظار أنف وأذن كارل شتورتز",
     "Karl Storz Hopkins ENT Scope", "Karl Storz", "7220AA", "endoscopes",
     900, 5200, 17500, 8000, 200, 92000, True, False,
     "/uploads/p-ent-scope.jpg",
     "منظار هوبكنز للأنف والأذن والحنجرة قطر 4 مم زاوية 0°",
     "Hopkins rod-lens ENT scope, 4mm, 0° direct view",
     [("القطر", "Diameter", "4 مم", "4 mm"),
      ("الزاوية", "Angle", "0°", "0°"),
      ("النوع", "Type", "صلب Hopkins", "Rigid Hopkins")]),

    ("SC-TWR-001", "olympus-visera-elite-ii", "برج تنظير أوليمبوس فيسيرا إيليت II",
     "Olympus VISERA ELITE II Tower", "Olympus", "OTV-S200", "towers",
     3800, 22000, 75000, 40000, 800, 0, False, True,
     "/uploads/p-tower-4k.jpg",
     "برج تنظير متكامل 4K يشمل الكاميرا ومصدر LED والشاشة والمسجّل",
     "Complete 4K endoscopy tower: camera, LED source, monitor, recorder",
     [("الدقة", "Resolution", "4K UHD", "4K UHD"),
      ("مصدر الإضاءة", "Light source", "LED 300W", "LED 300W"),
      ("الشاشة", "Monitor", "31 بوصة طبية", '31" medical grade'),
      ("التسجيل", "Recording", "USB / HDMI", "USB / HDMI")]),

    ("SC-TWR-002", "stryker-1688-tower", "برج ستريكر 1688 AIM 4K",
     "Stryker 1688 AIM 4K Tower", "Stryker", "1688-010-000", "towers",
     4200, 24500, 84000, 45000, 900, 0, False, True,
     "/uploads/p-tower-1688.jpg",
     "برج 4K مع تقنية التصوير بالأشعة تحت الحمراء لتمييز الأنسجة",
     "4K tower with infrared fluorescence imaging modes",
     [("الدقة", "Resolution", "4K", "4K"),
      ("أوضاع التصوير", "Imaging modes", "4 أوضاع متقدمة", "4 advanced modes"),
      ("مصدر الإضاءة", "Light source", "LED", "LED")]),

    ("SC-OR-001", "erbe-vio-300d", "جهاز كي جراحي إربي VIO 300D",
     "ERBE VIO 300D Electrosurgery Unit", "ERBE", "VIO 300D", "or-equipment",
     1600, 9400, 32000, 14000, 350, 0, False, False,
     "/uploads/p-electrosurgery.jpg",
     "وحدة كي أحادية وثنائية القطب مع أوضاع قطع دقيقة",
     "Mono/bipolar electrosurgical unit with precise cutting modes",
     [("القدرة", "Power", "300 وات", "300 W"),
      ("الأوضاع", "Modes", "Cut / Coag / Bipolar", "Cut / Coag / Bipolar")]),

    ("SC-OR-002", "drager-fabius-plus", "جهاز تخدير دريجر فابيوس بلس",
     "Dräger Fabius Plus Anesthesia Machine", "Dräger", "Fabius Plus", "or-equipment",
     2400, 14000, 48000, 25000, 500, 0, False, False,
     "/uploads/p-anesthesia.jpg",
     "جهاز تخدير متكامل بمروحة إلكترونية وشاشة مراقبة الغازات",
     "Complete anesthesia workstation with electronic ventilator and gas monitoring",
     [("أوضاع التهوية", "Ventilation", "VCV / PCV / PS", "VCV / PCV / PS"),
      ("المبخرات", "Vaporizers", "مبخرين", "Dual vaporizer")]),

    ("SC-MON-001", "mindray-umec12", "مونيتور علامات حيوية مايندراي uMEC12",
     "Mindray uMEC12 Patient Monitor", "Mindray", "uMEC12", "monitoring",
     380, 2200, 7500, 3500, 90, 42000, True, True,
     "/uploads/p-patient-monitor.jpg",
     "مونيتور 12 بوصة يقيس ECG و SpO2 والضغط والحرارة والتنفس",
     '12" monitor: ECG, SpO2, NIBP, temperature and respiration',
     [("الشاشة", "Display", "12.1 بوصة لمس", '12.1" touchscreen'),
      ("البارامترات", "Parameters", "ECG, SpO2, NIBP, Temp, Resp",
       "ECG, SpO2, NIBP, Temp, Resp"),
      ("البطارية", "Battery", "حتى 5 ساعات", "Up to 5 hours")]),

    ("SC-MON-002", "ecg-schiller-at-102", "جهاز رسم قلب شيلر AT-102",
     "Schiller AT-102 ECG Machine", "Schiller", "AT-102 G2", "monitoring",
     260, 1500, 5200, 2500, 60, 28000, True, False,
     "/uploads/p-ecg.jpg",
     "جهاز تخطيط قلب 12 قناة مع تفسير آلي وطابعة حرارية",
     "12-lead ECG with automatic interpretation and thermal printer",
     [("القنوات", "Channels", "12 قناة", "12-lead"),
      ("التفسير", "Interpretation", "آلي", "Automatic")]),

    ("SC-RES-001", "philips-everflo-oxygen", "مولد أكسجين فيليبس EverFlo 5L",
     "Philips EverFlo Oxygen Concentrator 5L", "Philips", "EverFlo Q", "respiratory",
     150, 850, 2800, 1500, 40, 22000, True, True,
     "photo-1584515933487-779824d29309?w=900",
     "مولد أكسجين منزلي 5 لتر/دقيقة — هادئ وموفر للكهرباء",
     "5 LPM home oxygen concentrator — quiet and energy efficient",
     [("التدفق", "Flow", "0.5 - 5 لتر/دقيقة", "0.5 - 5 LPM"),
      ("النقاء", "Purity", "93% ± 3", "93% ± 3"),
      ("مستوى الصوت", "Noise", "45 ديسيبل", "45 dB"),
      ("الوزن", "Weight", "14 كجم", "14 kg")]),

    ("SC-RES-002", "resmed-lumis-150", "جهاز تنفس ريزميد Lumis 150 VPAP",
     "ResMed Lumis 150 VPAP ST", "ResMed", "Lumis 150", "respiratory",
     220, 1300, 4400, 2500, 55, 38000, True, False,
     "photo-1512069772995-ec65ed45afd6?w=900",
     "جهاز تنفس ثنائي المستوى للحالات المزمنة مع مرطب مدمج",
     "Bi-level ventilator for chronic respiratory support with integrated humidifier",
     [("الأوضاع", "Modes", "CPAP / S / ST / T", "CPAP / S / ST / T"),
      ("الضغط", "Pressure", "3 - 25 سم ماء", "3 - 25 cmH2O")]),

    ("SC-RES-003", "nebulizer-omron-c28", "بخاخة أومرون CompAir C28",
     "Omron CompAir C28 Nebulizer", "Omron", "NE-C28P", "respiratory",
     45, 260, 850, 400, 15, 2600, True, False,
     "photo-1631549916768-4119b2e5f926?w=900",
     "بخاخة ضاغط للأطفال والكبار مع أقنعة كاملة",
     "Compressor nebulizer for adults and children with full mask set",
     [("معدل البخ", "Nebulization rate", "0.3 مل/دقيقة", "0.3 ml/min"),
      ("حجم الجزيئات", "Particle size", "3 ميكرون", "3 µm")]),

    ("SC-HOM-001", "electric-hospital-bed-3f", "سرير طبي كهربائي 3 حركات",
     "Electric Hospital Bed — 3 Functions", "Hill-Rom", "HR-E3", "home-care",
     120, 700, 2300, 1200, 35, 24000, True, True,
     "photo-1519494080410-f9aa76cb4283?w=900",
     "سرير طبي كهربائي بريموت، حواجز جانبية، وعجلات بمكابح",
     "Electric bed with remote, side rails and locking castors",
     [("الحركات", "Functions", "3 حركات كهربائية", "3 electric functions"),
      ("الحمولة", "Load capacity", "200 كجم", "200 kg"),
      ("المقاس", "Dimensions", "200×90 سم", "200×90 cm")]),

    ("SC-HOM-002", "air-mattress-anti-bedsore", "مرتبة هوائية مضادة لقرح الفراش",
     "Anti-Bedsore Air Mattress", "Apex", "Domus 2", "home-care",
     35, 200, 650, 300, 10, 3200, True, False,
     "photo-1631217868264-e5b90bb7e133?w=900",
     "مرتبة هوائية متناوبة الضغط مع مضخة صامتة",
     "Alternating pressure air mattress with silent pump",
     [("الدورة", "Cycle", "كل 6 دقائق", "Every 6 minutes"),
      ("الحمولة", "Capacity", "135 كجم", "135 kg")]),

    ("SC-HOM-003", "wheelchair-standard", "كرسي متحرك قابل للطي",
     "Foldable Standard Wheelchair", "Karma", "KM-2500", "home-care",
     30, 170, 550, 250, 10, 4500, True, False,
     "photo-1595079676339-1534801ad6cf?w=900",
     "كرسي متحرك خفيف قابل للطي مع مساند أرجل قابلة للفك",
     "Lightweight foldable wheelchair with removable footrests",
     [("الوزن", "Weight", "13 كجم", "13 kg"),
      ("الحمولة", "Capacity", "110 كجم", "110 kg")]),

    ("SC-HOM-004", "patient-lift-hoist", "رافعة مرضى هيدروليك",
     "Hydraulic Patient Lift", "Invacare", "Reliant 450", "home-care",
     90, 520, 1750, 900, 25, 16500, True, False,
     "photo-1576091160550-2173dba999ef?w=900",
     "رافعة مرضى لنقل المريض بأمان بين السرير والكرسي",
     "Patient hoist for safe transfer between bed and chair",
     [("الحمولة", "Capacity", "200 كجم", "200 kg"),
      ("النوع", "Type", "هيدروليك يدوي", "Manual hydraulic")]),

    ("SC-STR-001", "autoclave-class-b-23l", "أوتوكلاف فئة B سعة 23 لتر",
     "Class B Autoclave 23L", "Melag", "Vacuklav 23B", "sterilization",
     280, 1600, 5400, 3000, 70, 68000, True, False,
     "photo-1583912267550-d6c2ac3196c0?w=900",
     "جهاز تعقيم بالبخار فئة B بثلاث مراحل تفريغ",
     "Class B steam sterilizer with triple pre-vacuum",
     [("السعة", "Capacity", "23 لتر", "23 L"),
      ("الفئة", "Class", "B", "B"),
      ("الدورة", "Cycle", "134°م / 4 دقائق", "134°C / 4 min")]),

    ("SC-STR-002", "endoscope-reprocessor", "جهاز غسيل وتعقيم المناظير",
     "Automated Endoscope Reprocessor", "Olympus", "OER-Pro", "sterilization",
     650, 3800, 13000, 7000, 150, 0, False, False,
     "photo-1580281658223-9b93f18ae9ae?w=900",
     "غسالة مناظير آلية بدورة تعقيم موثقة ومطابقة للمعايير",
     "Automated endoscope washer-disinfector with validated cycles",
     [("السعة", "Capacity", "منظار واحد/دورة", "1 scope per cycle"),
      ("مدة الدورة", "Cycle time", "28 دقيقة", "28 minutes")]),
]

POSTS = [
    ("how-to-choose-endoscope", "كيف تختار المنظار المناسب لعيادتك؟",
     "How to Choose the Right Endoscope for Your Clinic",
     "دليل عملي يشرح الفروق بين المناظير المرنة والصلبة، وكيف تحدد القطر وقناة العمل المناسبة لنوع الإجراءات التي تقوم بها.",
     "A practical guide to flexible vs rigid scopes, and how to pick the right diameter and working channel.",
     """اختيار المنظار المناسب قرار يؤثر مباشرة على جودة التشخيص وسلامة المريض.

أولاً: حدد نوع الإجراء
المناظير المرنة مناسبة للجهاز الهضمي والقصبة الهوائية، بينما المناظير الصلبة أنسب للمفاصل والبطن والأنف والأذن.

ثانياً: قطر الأنبوب
كل ما قل القطر كل ما زادت راحة المريض، لكن قناة العمل تصغر أيضاً. للمعدة القطر المعتاد 9-10 مم، وللقولون 11-13 مم.

ثالثاً: قناة العمل
لو هتستخدم أدوات علاجية (كماشات، سلك كي، حقن) محتاج قناة 2.8 مم على الأقل، ويفضل 3.2 مم للإجراءات العلاجية المتقدمة.

رابعاً: جودة الصورة
الفرق بين HD و 4K واضح جداً في تمييز الأنسجة الدقيقة. لو الإجراءات تشخيصية بحتة، HD كافي؛ أما الجراحات الدقيقة فـ4K استثمار يستحق.

خامساً: الإيجار أم الشراء؟
لو معدل الاستخدام أقل من 8 حالات شهرياً، الإيجار عادة أوفر بنسبة 40-60% خصوصاً مع احتساب تكاليف الصيانة والتعقيم.""",
     """Choosing the right endoscope directly affects diagnostic quality and patient safety.

Start with the procedure type: flexible scopes suit GI and airway work; rigid scopes are better for joints, abdomen and ENT.

Insertion tube diameter: smaller is more comfortable for the patient but reduces channel size. Gastroscopes are typically 9-10mm, colonoscopes 11-13mm.

Working channel: therapeutic tools need at least 2.8mm, ideally 3.2mm for advanced procedures.

Image quality: HD is sufficient for purely diagnostic work; 4K pays off in fine surgical detail.

Rent or buy? Below roughly 8 cases per month, renting is typically 40-60% cheaper once maintenance and reprocessing costs are included.""",
     ["مناظير", "دليل", "شراء"]),

    ("endoscope-sterilization-guide", "دليل تعقيم المناظير: الخطوات السبع المعتمدة",
     "Endoscope Reprocessing: The 7 Validated Steps",
     "التعقيم غير الصحيح هو السبب الأول لانتقال العدوى بين المرضى. تعرف على البروتوكول الكامل خطوة بخطوة.",
     "Improper reprocessing is the leading cause of scope-related cross-infection. Here is the full protocol.",
     """التعقيم الصحيح للمناظير ليس رفاهية — هو خط الدفاع الأول ضد العدوى.

1. التنظيف الأولي (Bedside cleaning): مسح الجهاز فوراً بعد الإجراء وشفط محلول منظف خلال دقيقة واحدة.
2. اختبار التسريب (Leak test): قبل الغمر في أي سائل، للتأكد من عدم دخول الماء لداخل الجهاز.
3. التنظيف اليدوي: فرش القنوات بالكامل بفرشاة مخصصة ومحلول إنزيمي.
4. الشطف: بماء نقي لإزالة بقايا المنظف.
5. التطهير عالي المستوى (HLD): غمر في مطهر معتمد أو استخدام جهاز غسيل آلي (AER).
6. الشطف النهائي والتجفيف: بماء معقم ثم كحول 70% وهواء مضغوط.
7. التخزين: معلقاً رأسياً في خزانة تهوية نظيفة وجافة.

في SCOPE نُسلّم كل منظار بعد دورة تعقيم موثقة، ومعه شهادة تعقيم بتاريخ ورقم الدورة.""",
     """Correct endoscope reprocessing is the first line of defense against infection.

1. Bedside cleaning immediately after the procedure.
2. Leak test before immersing in any fluid.
3. Manual cleaning: brush all channels with enzymatic detergent.
4. Rinse thoroughly with clean water.
5. High-level disinfection, manually or in an automated reprocessor.
6. Final rinse with sterile water, then 70% alcohol flush and forced air drying.
7. Storage: hang vertically in a clean, ventilated drying cabinet.

Every SCOPE scope ships after a validated cycle with a dated sterilization certificate.""",
     ["تعقيم", "سلامة المرضى"]),

    ("rent-vs-buy-medical-equipment", "الإيجار أم الشراء؟ حسبة الأرقام للأجهزة الطبية",
     "Rent or Buy? The Numbers Behind Medical Equipment",
     "مقارنة مالية عملية بالأرقام بين إيجار وشراء الأجهزة الطبية للعيادات الناشئة.",
     "A practical financial comparison between renting and buying for growing clinics.",
     """السؤال ده بيتكرر كتير من أصحاب العيادات الجديدة، والإجابة تعتمد على ثلاثة أرقام فقط.

الرقم الأول: معدل الاستخدام
جهاز بيشتغل 20 يوم في الشهر يختلف تماماً عن جهاز بيشتغل 4 أيام.

الرقم الثاني: التكلفة الخفية
سعر الشراء مش النهاية. أضف: صيانة سنوية (5-12% من قيمة الجهاز)، تعقيم، قطع غيار، تأمين، وإهلاك.

الرقم الثالث: تكلفة رأس المال
الفلوس المجمدة في جهاز ممكن تتحول لتوسعة أو تسويق يجيب عائد أعلى.

قاعدة تقريبية: لو معدل استخدام الجهاز أقل من 40% من أيام العمل، الإيجار غالباً أوفر.

مثال: منظار معدة سعره 450 ألف جنيه، إيجاره 1800 جنيه/يوم. لو محتاجه 5 أيام شهرياً = 9000 جنيه شهرياً = 108 ألف سنوياً، مقابل 450 ألف + صيانة 35 ألف سنوياً. الإيجار أوفر بوضوح حتى السنة الرابعة.""",
     """This comes up constantly from new clinic owners, and it comes down to three numbers.

Utilization rate: a device used 20 days a month is a completely different case from one used 4 days.

Hidden cost of ownership: purchase price is not the end. Add annual maintenance (5-12% of value), reprocessing, spare parts, insurance and depreciation.

Cost of capital: money locked in a device could fund expansion or marketing with a higher return.

Rule of thumb: below 40% utilization of working days, renting usually wins.

Example: a gastroscope at EGP 450,000 rents for EGP 1,800/day. Five days a month is EGP 108,000/year versus EGP 450,000 plus roughly EGP 35,000/year maintenance. Renting stays cheaper well into year four.""",
     ["تمويل", "إدارة عيادات"]),

    ("home-oxygen-safety", "الأكسجين المنزلي: 8 قواعد سلامة لا تتنازل عنها",
     "Home Oxygen: 8 Safety Rules You Cannot Skip",
     "إرشادات أساسية لأسرة المرضى الذين يستخدمون مولدات الأكسجين في المنزل.",
     "Essential guidance for families using oxygen concentrators at home.",
     """الأكسجين آمن جداً لو اتبعت القواعد، وخطر لو اتهاونت فيها.

1. ممنوع التدخين نهائياً في نفس الغرفة أو على بعد 3 أمتار.
2. ابعد الجهاز عن مصادر اللهب والبوتاجاز والمدفأة بمسافة لا تقل عن 2 متر.
3. لا تستخدم كريمات أو مراهم زيتية أو فازلين حول الأنف.
4. اترك 30 سم على الأقل حول الجهاز للتهوية.
5. نظّف الفلتر الخارجي أسبوعياً بالماء الفاتر واتركه يجف تماماً.
6. غيّر الأنبوب (الكانيولا) كل أسبوعين والمرطب كل شهر.
7. لا تغيّر معدل التدفق من نفسك — التزم بوصفة الطبيب.
8. جهّز خطة بديلة: أسطوانة احتياطية أو بطارية لحالات انقطاع الكهرباء.

فريق SCOPE بيركّب الجهاز ويشرح الاستخدام لأسرة المريض مجاناً مع كل عملية تأجير.""",
     """Oxygen is very safe when handled correctly and dangerous when it is not.

1. Absolutely no smoking in the room or within 3 meters.
2. Keep the unit at least 2 meters from flames, stoves and heaters.
3. Avoid oil-based creams or petroleum jelly around the nose.
4. Leave 30cm clearance around the unit for ventilation.
5. Wash the external filter weekly in warm water and dry fully.
6. Replace the cannula every two weeks and the humidifier monthly.
7. Never adjust the flow rate yourself — follow the prescription.
8. Have a backup: a reserve cylinder or battery for power cuts.

SCOPE installs the unit and trains the family free with every rental.""",
     ["أكسجين", "رعاية منزلية", "سلامة"]),
]


def reset_db():
    print("⚠️  مسح كل الجداول وإعادة إنشائها...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(User).count() > 0:
            print("ℹ️  قاعدة البيانات تحتوي على بيانات بالفعل. استخدم --reset لإعادة البناء.")
            return

        # ---------------------------------------------------------- users
        admin = User(name="مدير النظام", email="admin@scope-eg.com",
                     phone="01113138839", password_hash=hash_password("Admin@123"),
                     role=UserRole.admin, organization="SCOPE Egypt",
                     city="الجيزة", address="الجيزة، مصر")
        db.add(admin)

        customers = [
            ("د. أحمد الشناوي", "ahmed@clinic-eg.com", "01001234567", "مركز الشناوي للمناظير", "الجيزة"),
            ("د. منى عبد الرحمن", "mona@dar-elshefa.com", "01102345678", "مستشفى دار الشفاء", "القاهرة"),
            ("د. كريم فؤاد", "karim@nilehospital.com", "01203456789", "مستشفى النيل التخصصي", "المعادي"),
            ("أ. سارة محمود", "sara.m@gmail.com", "01234567890", "", "6 أكتوبر"),
            ("د. هشام عز الدين", "hisham@ortho-eg.com", "01555678901", "عيادة العظام والمفاصل", "الإسكندرية"),
            ("أ. محمد رأفت", "m.raafat@outlook.com", "01098765432", "", "الجيزة"),
        ]
        cust_objs = []
        for n, e, p, org, city in customers:
            u = User(name=n, email=e, phone=p, password_hash=hash_password("Customer@123"),
                     role=UserRole.customer, organization=org, city=city,
                     address=f"{city}، مصر")
            db.add(u)
            cust_objs.append(u)
        db.flush()
        print(f"✓ المستخدمون: 1 مدير + {len(cust_objs)} عميل")

        # ----------------------------------------------------- categories
        cats = {}
        for c in CATEGORIES:
            obj = Category(**c)
            db.add(obj)
            cats[c["slug"]] = obj
        db.flush()
        print(f"✓ الأقسام: {len(cats)}")

        # ------------------------------------------------------- products
        prods = []
        for (sku, slug, ar, en, brand, model, cat, d, w, mo, dep, late,
             sale, forsale, feat, img, short_ar, short_en, specs) in PRODUCTS:
            p = Product(
                sku=sku, slug=slug, name_ar=ar, name_en=en, brand=brand, model=model,
                category_id=cats[cat].id, short_ar=short_ar, short_en=short_en,
                description_ar=short_ar + "\n\nجميع أجهزتنا تخضع لدورة تعقيم موثقة قبل كل تسليم، "
                                          "ويشمل الإيجار التركيب والتدريب والدعم الفني طوال المدة.",
                description_en=short_en + "\n\nEvery device goes through a validated reprocessing "
                                          "cycle before delivery. Rental includes installation, "
                                          "training and technical support.",
                image=img_url(img),
                images=[img_url(img)],
                specs=[{"key_ar": k1, "key_en": k2, "value_ar": v1, "value_en": v2}
                       for k1, k2, v1, v2 in specs],
                is_for_rent=True, is_for_sale=forsale, is_featured=feat,
                sale_price=sale, rent_daily=d, rent_weekly=w, rent_monthly=mo,
                deposit=dep, late_fee_per_day=late,
                min_rent_days=1 if d < 500 else 2,
                requires_training=d > 1000,
                warranty_months=12 if forsale else 0,
            )
            db.add(p)
            prods.append(p)
        db.flush()
        print(f"✓ المنتجات: {len(prods)}")

        # ---------------------------------------------------------- units
        locations = ["المخزن الرئيسي — الجيزة", "فرع المهندسين", "مخزن 6 أكتوبر"]
        unit_count = 0
        for p in prods:
            n = random.randint(2, 5) if p.rent_daily < 1000 else random.randint(2, 3)
            for k in range(n):
                purchase = date.today() - timedelta(days=random.randint(120, 1400))
                u = Unit(
                    product_id=p.id,
                    serial_number=f"{p.sku}-{1000 + k}",
                    asset_tag=f"AST-{p.id:03d}{k:02d}",
                    status=UnitStatus.available,
                    purchase_date=purchase,
                    purchase_cost=round((p.sale_price or p.rent_monthly * 9) *
                                        random.uniform(0.75, 0.95), 2),
                    location=random.choice(locations),
                    last_service_at=date.today() - timedelta(days=random.randint(5, 120)),
                    next_service_due=date.today() + timedelta(days=random.randint(-15, 200)),
                    total_rentals=random.randint(0, 28),
                )
                db.add(u)
                unit_count += 1
        db.flush()
        print(f"✓ الوحدات (سيريالات): {unit_count}")

        # --------------------------------------------------------- orders
        today = date.today()
        scenarios = [
            # (customer_idx, product_idx, days_offset_start, duration, status, method, paid)
            (0, 0, -45, 14, OrderStatus.completed, PaymentMethod.stripe, True),
            (1, 4, -30, 30, OrderStatus.completed, PaymentMethod.cash_on_delivery, True),
            (2, 8, -20, 21, OrderStatus.active, PaymentMethod.cash_on_delivery, False),
            (0, 1, -12, 40, OrderStatus.active, PaymentMethod.stripe, True),
            (3, 10, -8, 60, OrderStatus.active, PaymentMethod.cash_on_delivery, True),
            (4, 2, -5, 7, OrderStatus.approved, PaymentMethod.cash_on_delivery, False),
            (5, 13, 2, 30, OrderStatus.pending, PaymentMethod.cash_on_delivery, False),
            (1, 5, 5, 10, OrderStatus.pending, PaymentMethod.stripe, False),
            (2, 17, -60, 5, OrderStatus.returned, PaymentMethod.cash_on_delivery, True),
            (3, 15, -25, 14, OrderStatus.completed, PaymentMethod.cash_on_delivery, True),
        ]
        made = 0
        for ci, pi, off, dur, status, method, paid in scenarios:
            cust = cust_objs[ci]
            p = prods[pi]
            start = today + timedelta(days=off)
            end = start + timedelta(days=dur - 1)
            days = date_span_days(start, end)
            price = best_rent_price(p, days)
            o = Order(
                code=code("ORD"), user_id=cust.id, type=OrderType.rent, status=status,
                start_date=start, end_date=end, days=days,
                payment_method=method,
                payment_status=PaymentStatus.paid if paid else PaymentStatus.unpaid,
                contact_name=cust.name, contact_phone=cust.phone,
                delivery_address=f"{cust.organization or cust.name} — {cust.city}",
                notes="",
                created_at=datetime.utcnow() - timedelta(days=abs(off) + 1),
            )
            db.add(o); db.flush()
            item = OrderItem(order_id=o.id, product_id=p.id, qty=1,
                             pricing_mode=PricingMode(price["mode"]),
                             pricing_breakdown=price["breakdown"],
                             unit_price=price["total"], deposit=p.deposit or 0,
                             line_total=price["total"])
            free = [u for u in p.units if u.status == UnitStatus.available]
            if free and status in (OrderStatus.approved, OrderStatus.active,
                                   OrderStatus.returned, OrderStatus.completed):
                unit = free[0]
                item.unit_id = unit.id
                if status == OrderStatus.active:
                    unit.status = UnitStatus.rented
                elif status == OrderStatus.approved:
                    unit.status = UnitStatus.reserved
            db.add(item); db.flush()
            o.subtotal = item.line_total
            o.deposit_total = item.deposit
            o.total = round(o.subtotal + o.deposit_total, 2)
            if status in (OrderStatus.returned, OrderStatus.completed):
                o.actual_return_date = end
                item.returned_at = datetime.utcnow()
                o.completed_at = datetime.utcnow()
            if status != OrderStatus.pending:
                o.approved_at = o.created_at + timedelta(hours=3)
                db.add(Invoice(order_id=o.id, number=code("INV"), total=o.total))
                db.add(Contract(order_id=o.id, number=code("CTR"), signed_by=cust.name,
                                signed_at=o.approved_at))
            if paid:
                db.add(Payment(order_id=o.id, amount=o.total, method=method,
                               status=PaymentStatus.paid,
                               reference="demo_" + o.code, note="دفعة كاملة"))
            made += 1
        db.flush()
        print(f"✓ الطلبات: {made}")

        # -------------------------------------------------------- tickets
        all_units = db.query(Unit).all()
        tickets = [
            (TicketType.sterilization, TicketStatus.done, TicketPriority.normal,
             "تعقيم روتيني بعد الإيجار", "دورة تعقيم كاملة فئة B", "م. طارق سليم", 250),
            (TicketType.maintenance, TicketStatus.in_progress, TicketPriority.high,
             "عطل في مصدر الإضاءة", "انخفاض شدة الإضاءة — يحتاج تغيير لمبة LED",
             "م. عمرو حسن", 3200),
            (TicketType.calibration, TicketStatus.open, TicketPriority.normal,
             "معايرة سنوية لمستشعر SpO2", "معايرة دورية مطلوبة حسب جدول الصيانة",
             "م. طارق سليم", 800),
            (TicketType.inspection, TicketStatus.done, TicketPriority.low,
             "فحص دوري ربع سنوي", "فحص شامل واختبار التسريب — النتيجة سليمة",
             "م. عمرو حسن", 400),
            (TicketType.maintenance, TicketStatus.open, TicketPriority.urgent,
             "تسريب في قناة العمل", "اختبار التسريب فشل — يحتاج إرسال للوكيل",
             "", 12000),
        ]
        for i, (tt, ts, tp, title, desc, tech, cost) in enumerate(tickets):
            u = all_units[i * 3 % len(all_units)]
            t = MaintenanceTicket(
                code=code("TCK"), unit_id=u.id, type=tt, status=ts, priority=tp,
                title=title, description=desc, technician=tech, cost=cost,
                scheduled_at=today + timedelta(days=random.randint(-10, 14)),
                next_due_at=today + timedelta(days=random.randint(60, 200)),
                created_at=datetime.utcnow() - timedelta(days=random.randint(1, 20)),
            )
            if ts == TicketStatus.done:
                t.completed_at = datetime.utcnow() - timedelta(days=random.randint(1, 8))
            elif ts in (TicketStatus.open, TicketStatus.in_progress):
                u.status = (UnitStatus.sterilizing if tt == TicketType.sterilization
                            else UnitStatus.maintenance)
            db.add(t)
        db.flush()
        print(f"✓ تذاكر الصيانة: {len(tickets)}")

        # -------------------------------------------------------- reviews
        review_data = [
            (0, 0, 5, "منظار ممتاز ووصل معقّم وفي الميعاد بالظبط. الفني ركّبه وشرح كل حاجة. تعامل محترم جداً."),
            (0, 1, 5, "استخدمناه في 12 حالة والصورة نضيفة جداً. هنكرر التعامل أكيد."),
            (4, 2, 4, "الجهاز حالته ممتازة، بس التوصيل اتأخر ساعتين عن الميعاد."),
            (8, 2, 5, "المونيتور دقيق والبطارية بتقعد فعلاً 5 ساعات. سعر الإيجار معقول جداً."),
            (10, 3, 5, "مولد الأكسجين هادي وشغال 24 ساعة من غير مشاكل. الوالدة مرتاحة معاه."),
            (13, 3, 4, "السرير الطبي عملي جداً والريموت سهل. الحواجز الجانبية محتاجة تظبيط بسيط."),
            (10, 5, 5, "خدمة ما بعد البيع ممتازة، اتصلت الساعة 11 بالليل وردوا وحلوا المشكلة."),
            (4, 1, 4, "جودة الصورة عالية، والتعقيم واضح إنه متعمل صح. شهادة التعقيم مرفقة."),
        ]
        for pi, ci, rating, comment in review_data:
            db.add(Review(product_id=prods[pi].id, user_id=cust_objs[ci].id,
                          rating=rating, comment=comment, is_approved=True,
                          created_at=datetime.utcnow() - timedelta(days=random.randint(2, 90))))
        db.flush()
        for p in prods:
            rs = [r for r in db.query(Review).filter(Review.product_id == p.id,
                                                     Review.is_approved.is_(True)).all()]
            if rs:
                p.rating_avg = sum(r.rating for r in rs) / len(rs)
                p.rating_count = len(rs)
        # تقييم واحد بانتظار الاعتماد
        db.add(Review(product_id=prods[6].id, user_id=cust_objs[2].id, rating=3,
                      comment="الجهاز كويس بس محتاج دليل استخدام بالعربي.", is_approved=False))
        print(f"✓ التقييمات: {len(review_data) + 1}")

        # ----------------------------------------------------------- blog
        for slug, ta, te, ea, ee, ba, be, tags in POSTS:
            db.add(Post(slug=slug, title_ar=ta, title_en=te, excerpt_ar=ea, excerpt_en=ee,
                        body_ar=ba, body_en=be, tags=tags, is_published=True,
                        author="فريق SCOPE",
                        cover=IMG + "photo-1516549655169-df83a0774514?w=1200",
                        published_at=datetime.utcnow() - timedelta(days=random.randint(3, 120)),
                        views=random.randint(40, 900)))
        print(f"✓ المقالات: {len(POSTS)}")

        # -------------------------------------------------- notifications
        db.add(Notification(for_admin=True, level="warning",
                            title_ar="تذاكر صيانة مفتوحة", title_en="Open maintenance tickets",
                            body_ar="يوجد تذاكر بحاجة لمتابعة", body_en="Tickets need attention",
                            link="/admin/maintenance"))
        db.add(Notification(user_id=cust_objs[0].id, level="success",
                            title_ar="مرحباً بك في سكوب 👋", title_en="Welcome to SCOPE 👋",
                            body_ar="تصفح الكتالوج واطلب الجهاز اللي محتاجه بضغطة واحدة.",
                            body_en="Browse the catalog and request any device in one tap."))

        # ------------------------------------------------------- settings
        for k, v in {
            "company_name_ar": "سكوب — الشركة المصرية للأجهزة الطبية",
            "company_name_en": "SCOPE Egypt Medical Equipment",
            "phone": "01113138839",
            "whatsapp": "201113138839",
            "email": "info@scope-eg.com",
            "address_ar": "الجيزة، جمهورية مصر العربية",
            "address_en": "Giza, Egypt",
            "delivery_fee": "0",
        }.items():
            db.add(Setting(key=k, value=v))

        db.commit()
        print("\n" + "=" * 58)
        print("✅ تم تجهيز البيانات بنجاح — Seed complete")
        print("=" * 58)
        print("  المدير   admin@scope-eg.com     / Admin@123")
        print("  عميل     ahmed@clinic-eg.com    / Customer@123")
        print("  عميل     mona@dar-elshefa.com   / Customer@123")
        print("=" * 58)
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    if "--reset" in sys.argv:
        reset_db()
    seed()
