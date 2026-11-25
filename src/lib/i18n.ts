import type {
  EmirateJurisdiction,
  EvictionReason,
  NoticeDeliveryChannel,
  PropertyType,
  ReadinessStatus,
  SeverityLevel,
} from '../core/types.ts';

export type Locale = 'ar' | 'en';
export type ThemeName = 'alabaster-dld' | 'slate-night';

export const STATUS_LABELS: Record<ReadinessStatus, Record<Locale, string>> = {
  ready: { ar: 'نظامي / جاهز للتجديد', en: 'Ready / Compliant' },
  conditional: { ar: 'مشروط / يحتاج استكمال', en: 'Conditional' },
  blocked: { ar: 'موقوف / مخالفة نظامية', en: 'Blocked / Breach' },
};

export const SEVERITY_LABELS: Record<SeverityLevel, Record<Locale, string>> = {
  blocker: { ar: 'عائق حرج', en: 'BLOCKER' },
  warning: { ar: 'تنبيه', en: 'WARNING' },
  info: { ar: 'معلومة', en: 'INFO' },
};

export const EMIRATE_LABELS: Record<EmirateJurisdiction, Record<Locale, string>> = {
  dubai_rera: {
    ar: 'دبي (RERA مرسوم 43/2013 وقانون 33/2008)',
    en: 'Dubai (RERA Decree 43/2013 & Law 33/2008)',
  },
  abudhabi_adrec: {
    ar: 'أبوظبي (تجميد ADREC 0% / توثيق وقانون 20/2006)',
    en: 'Abu Dhabi (ADREC 0% Freeze / Tawtheeq)',
  },
  sharjah_municipality: {
    ar: 'الشارقة (قانون 5/2024 قفل 3 و5 سنوات)',
    en: 'Sharjah (Municipality Law 5/2024 Lock)',
  },
};

export const PROPERTY_LABELS: Record<PropertyType, Record<Locale, string>> = {
  residential: { ar: 'سكني', en: 'Residential' },
  commercial: { ar: 'تجاري', en: 'Commercial' },
  industrial: { ar: 'صناعي', en: 'Industrial' },
};

export const CHANNEL_LABELS: Record<NoticeDeliveryChannel, Record<Locale, string>> = {
  notary_or_registered_mail: {
    ar: 'الكاتب العدل أو البريد المسجل',
    en: 'Notary Public / Registered Mail',
  },
  email_written_formal: {
    ar: 'إخطار كتابي رسمي / بريد إلكتروني',
    en: 'Formal Written Notice / Email',
  },
  whatsapp_or_verbal: {
    ar: 'واتساب / رسالة نصية / شفهي',
    en: 'WhatsApp / SMS / Verbal',
  },
  none: {
    ar: 'بدون إخطار',
    en: 'None',
  },
};

export const EVICTION_LABELS: Record<EvictionReason, Record<Locale, string>> = {
  none: { ar: 'لا يوجد طلب إخلاء', en: 'None' },
  property_sale: { ar: 'بيع العقار (م25/2)', en: 'Property Sale (Art. 25(2))' },
  personal_use_first_degree: {
    ar: 'السكن الشخصي / الدرجة الأولى (م25/2)',
    en: 'Personal Use / 1st Degree (Art. 25(2))',
  },
  demolition_or_reconstruction: {
    ar: 'الهدم أو إعادة البناء (م25/2)',
    en: 'Demolition / Reconstruction (Art. 25(2))',
  },
  comprehensive_maintenance: {
    ar: 'الصيانة الشاملة (م25/2)',
    en: 'Comprehensive Maintenance (Art. 25(2))',
  },
  non_payment_breach: {
    ar: 'التخلف عن السداد (م25/1)',
    en: 'Non-Payment / Breach (Art. 25(1))',
  },
  end_of_term_no_cause: {
    ar: 'نهاية المدة دون سبب حصري',
    en: 'End of Term (No Statutory Cause)',
  },
};

export const UI_COPY = {
  ar: {
    brandTitle: 'ReraRentAE — مدقق زيادات الإيجار ومؤشر RERA والإخلاء الموثق',
    brandSubtitle:
      'مرسوم دبي 43/2013 وقانون 33/2008 (90 يوماً / 12 شهراً بالكاتب العدل)، تجميد ADREC 0% بأبوظبي، وقفل الشارقة 5/2024',
    langSwitch: 'English',
    themeLight: 'نهاري',
    themeDark: 'ليلي',
    modeServer: 'خادم SQLite WAL',
    modeLocal: 'تخزين محلي $0',
    tabs: {
      dashboard: 'المؤشر والإخلاء',
      controls: 'الضوابط والنتائج',
      csv: 'محفظة الوحدات CSV',
      vault: 'الخزنة والطباعة PDF',
    },
    presetsLabel: 'سيناريوهات إماراتية جاهزة:',
    publicSealTitle: 'ملف تدقيق الإيجارات والإخلاء الإماراتي المختوم',
    backToStudio: 'العودة للاستوديو',
    printPdf: 'طباعة / تصدير PDF',
    loadingReport: 'جاري تحميل التقرير المختوم...',
    missingReport: 'تعذر العثور على هذا التقرير المختوم أو لم يُغلق نهائياً بعد.',
    viewsCount: 'عدد المشاهدات',
    sealedAt: 'تاريخ الختم:',
    shaDigest: 'بصمة SHA-256:',
  },
  en: {
    brandTitle: 'ReraRentAE — UAE Rental Cap, Notice SLA & Eviction Studio',
    brandSubtitle:
      'Dubai Decree 43/2013 & Law 33/2008 (90d notice / 12m Notary eviction), Abu Dhabi ADREC 0% Freeze & Sharjah Law 5/2024',
    langSwitch: 'العربية',
    themeLight: 'Light',
    themeDark: 'Night',
    modeServer: 'SQLite WAL Server',
    modeLocal: '$0 Local Vault',
    tabs: {
      dashboard: 'Brackets & Eviction',
      controls: 'Controls & Findings',
      csv: 'Unit Portfolio CSV',
      vault: 'Dossier Vault & PDF',
    },
    presetsLabel: 'UAE Tenancy Scenarios:',
    publicSealTitle: 'Sealed UAE Rental Cap & Eviction Readiness Dossier',
    backToStudio: 'Back to Studio',
    printPdf: 'Print / A4 PDF',
    loadingReport: 'Loading sealed rental readiness dossier...',
    missingReport: 'Sealed report was not found or has not been finalized yet.',
    viewsCount: 'Views',
    sealedAt: 'Sealed At:',
    shaDigest: 'SHA-256 Digest:',
  },
} as const;
