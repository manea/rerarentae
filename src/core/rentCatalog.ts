import type { RentControlSpec } from './types.ts';

export const RERARENTAE_TOOL_VERSION = '0.5.0';

// Dubai Decree No. 43 of 2013 & Law No. 33 of 2008
export const DUBAI_RERA_NOTICE_DAYS = 90;
export const DUBAI_EVICTION_NOTICE_DAYS = 365;
export const DUBAI_RE_RENT_BAN_RESIDENTIAL_YEARS = 2;
export const DUBAI_RE_RENT_BAN_COMMERCIAL_YEARS = 3;
export const DUBAI_RDC_FILING_FEE_PCT = 3.5;
export const DUBAI_RDC_MIN_FEE_AED = 500;
export const DUBAI_RDC_MAX_LEASE_FEE_AED = 20_000;
export const DUBAI_RDC_ADMIN_ADDON_AED = 120; // Process service 100 + Knowledge 10 + Innovation 10

// Abu Dhabi Law No. 20 of 2006 & ADREC 0% Freeze Directive
export const ABUDHABI_STATUTORY_CAP_PCT = 5;
export const ABUDHABI_ADREC_FREEZE_PCT = 0;
export const ABUDHABI_RESIDENTIAL_NOTICE_DAYS = 60;
export const ABUDHABI_COMMERCIAL_NOTICE_DAYS = 90;

// Sharjah Law No. 5 of 2024
export const SHARJAH_RESIDENTIAL_LOCK_YEARS = 3;
export const SHARJAH_COMMERCIAL_LOCK_YEARS = 5;
export const SHARJAH_SUBSEQUENT_LOCK_YEARS = 2;
export const SHARJAH_EVICTION_NOTICE_DAYS = 90;
export const SHARJAH_RESIDENTIAL_NOTICE_DAYS = 90;

export const LEGAL_DISCLAIMER_EN =
  'Notice: ReraRentAE is an independent UAE rental cap, notice SLA & eviction readiness estimator and is NOT affiliated with, endorsed by, or connected to the Dubai Land Department (DLD / RERA / RDC), Abu Dhabi Real Estate Centre (ADREC / ADJD / Tawtheeq), or Sharjah Municipality Rental Disputes Committee. Outputs are indicative only and do not constitute legal advice.';

export const LEGAL_DISCLAIMER_AR =
  'تنبيه مهم: أداة ReraRentAE أداة تقنية مستقلة لفحص حدود الزيادة الإيجارية ومهل الإخطار والإخلاء في الإمارات وليست تابعة أو معتمدة من دائرة الأراضي والأملاك بدبي (DLD / RERA / RDC) أو مركز أبوظبي العقاري (ADREC / توثيق / دائرة القضاء) أو بلدية الشارقة، ومخرجاتها استرشادية ولا تُعد استشارة قانونية.';

export const RENT_CONTROLS: readonly RentControlSpec[] = [
  {
    id: 'RENT-CTRL-01',
    weight: 20,
    titleEn: 'Official Ejari / Tawtheeq / Sharjah Municipality Registration',
    titleAr: 'توثيق العقد رسمياً في إيجاري / توثيق / بلدية الشارقة',
    descriptionEn:
      'Maintain active tenancy contract registration in Ejari (Dubai), Tawtheeq (Abu Dhabi), or Sharjah Municipality within statutory windows to preserve legal standing.',
    descriptionAr:
      'الالتزام بتسجيل العقد في إيجاري (دبي) أو توثيق (أبوظبي) أو بلدية الشارقة لضمان سماع الدعوى وحفظ الحقوق.',
  },
  {
    id: 'RENT-CTRL-02',
    weight: 20,
    titleEn: 'Official RERA Smart Rental Index / ADREC Cap Verification',
    titleAr: 'التحقق من مؤشر الإيجارات الذكي RERA أو تجميد ADREC 0%',
    descriptionEn:
      'Benchmark renewal rent strictly against DLD Smart Rental Index (Decree 43/2013 brackets) or Abu Dhabi ADREC 0% cap rather than asking prices.',
    descriptionAr:
      'الاحتكام حصراً لمؤشر RERA الذكي بدبي (شرائح 43/2013) أو تجميد ADREC 0% بأبوظبي أو القفل 3/5 سنوات بالشارقة دون الأسعار الإعلانية.',
  },
  {
    id: 'RENT-CTRL-03',
    weight: 20,
    titleEn: 'Pre-Expiry Written Notice Window (90d Dubai / 60d AD Res)',
    titleAr: 'الالتزام بمهلة الإخطار الكتابي قبل الانتهاء (90 يوماً / 60 يوماً)',
    descriptionEn:
      'Serve and archive dated written rent or renewal change notices ahead of the 90-day (Dubai Art. 14) or 60-day residential (Abu Dhabi Art. 20) cutoff.',
    descriptionAr:
      'إرسال إخطار تعديل الإيجار أو الشروط كتابياً قبل 90 يوماً في دبي (م14) أو 60 يوماً سكنياً / 90 تجارياً في أبوظبي (م20).',
  },
  {
    id: 'RENT-CTRL-04',
    weight: 15,
    titleEn: '12-Month Notary Public / Registered Mail Eviction Compliance',
    titleAr: 'التزام إخطار الإخلاء 12 شهراً بالكاتب العدل أو البريد المسجل',
    descriptionEn:
      'In Dubai Art. 25(2) evictions (sale, personal use, demolition, major works), serve full 12-month notice strictly via Notary Public or Registered Mail.',
    descriptionAr:
      'في إخلاء م25(2) بدبي (البيع، السكن الشخصي، الهدم، الصيانة الشاملة)، توجيه إخطار 12 شهراً كاملاً عبر الكاتب العدل أو البريد المسجل فقط.',
  },
  {
    id: 'RENT-CTRL-05',
    weight: 15,
    titleEn: '2-Year / 3-Year Re-Rent Ban & Good-Faith Audit Log',
    titleAr: 'مراقبة حظر إعادة التأجير (سنتان سكنياً / 3 سنوات تجارياً)',
    descriptionEn:
      'Enforce Art. 25(3) lockout tracking after personal-use eviction and document genuine Sharjah 3-year/5-year tenancy lock compliance.',
    descriptionAr:
      'منع إعادة التأجير للغير خلال سنتين (سكني) أو 3 سنوات (تجاري) بعد الإخلاء للاستخدام الشخصي وفق م25(3) ومراقبة القفل الزمني بالشارقة.',
  },
  {
    id: 'RENT-CTRL-06',
    weight: 10,
    titleEn: 'Offer-and-Deposit / RDC Evidence Bundle Readiness',
    titleAr: 'جاهزية ملف الإيداع والعرض وحساب رسوم المنازعة (3.5%)',
    descriptionEn:
      'Retain Ejari/Tawtheeq PDF, Emirates ID, IBAN, RERA index snapshot, and dated notices ready for Offer & Deposit or RDC filing.',
    descriptionAr:
      'حفظ عقد إيجاري/توثيق، الهوية الإماراتية، IBAN، لقطة المؤشر الذكي، والإخطارات المؤرخة لملف العرض والإيداع أو مركز فض المنازعات.',
  },
] as const;
