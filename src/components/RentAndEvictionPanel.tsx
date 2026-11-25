import { Building2, CalendarClock, Gavel, ShieldCheck } from 'lucide-react';
import type {
  AssessmentInput,
  AssessmentResult,
  EmirateJurisdiction,
  EvictionReason,
  NoticeDeliveryChannel,
  PropertyType,
} from '../core/types.ts';
import {
  CHANNEL_LABELS,
  EMIRATE_LABELS,
  EVICTION_LABELS,
  PROPERTY_LABELS,
  type Locale,
} from '../lib/i18n.ts';

interface Props {
  input: AssessmentInput;
  result: AssessmentResult;
  locale: Locale;
  onChange: (patch: Partial<AssessmentInput>) => void;
}

export function RentAndEvictionPanel({ input, result, locale, onChange }: Props) {
  const isAr = locale === 'ar';
  const { rentEval, evictionEval } = result;

  const numChange =
    (field: keyof AssessmentInput) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Number(e.target.value);
      onChange({ [field]: Number.isFinite(val) && val >= 0 ? val : 0 });
    };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Card 1: Emirate, Contract & Rent Benchmarks */}
        <section className="rent-card rounded-2xl p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[var(--accent-primary)]" />
            <h3 className="text-sm font-extrabold text-[var(--text-primary)]">
              {isAr
                ? '1. الإمارة والعقد وشريحة الإيجار الرسمية'
                : '1. UAE Jurisdiction, Lease & Index Benchmarks'}
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">
                {isAr ? 'الأطراف (المؤجر / المستأجر)' : 'Parties (Landlord / Tenant)'}
              </label>
              <input
                type="text"
                className="rent-input"
                value={input.partyName}
                onChange={(e) => onChange({ partyName: e.target.value })}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">
                {isAr ? 'مرجع الوحدة / رقم إيجاري' : 'Unit / Ejari / Tawtheeq Ref'}
              </label>
              <input
                type="text"
                dir="ltr"
                className="rent-input rent-mono"
                value={input.unitReference}
                onChange={(e) => onChange({ unitReference: e.target.value })}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">
                {isAr ? 'الإمارة / الجهة التنظيمية' : 'Emirate Jurisdiction'}
              </label>
              <select
                data-testid="emirate-select"
                className="rent-input"
                value={input.emirate}
                onChange={(e) => onChange({ emirate: e.target.value as EmirateJurisdiction })}
              >
                {(Object.keys(EMIRATE_LABELS) as EmirateJurisdiction[]).map((em) => (
                  <option key={em} value={em}>
                    {EMIRATE_LABELS[em][locale]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">
                {isAr ? 'نوع العقار' : 'Property Type'}
              </label>
              <select
                className="rent-input"
                value={input.propertyType}
                onChange={(e) => onChange({ propertyType: e.target.value as PropertyType })}
              >
                {(Object.keys(PROPERTY_LABELS) as PropertyType[]).map((pt) => (
                  <option key={pt} value={pt}>
                    {PROPERTY_LABELS[pt][locale]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">
                {isAr ? 'تاريخ انتهاء العقد' : 'Lease Expiry Date'}
              </label>
              <input
                type="date"
                dir="ltr"
                className="rent-input rent-mono"
                value={input.leaseExpiryDate}
                onChange={(e) => onChange({ leaseExpiryDate: e.target.value })}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">
                {isAr ? 'الإيجار السنوي الحالي (د.إ)' : 'Current Annual Rent (AED)'}
              </label>
              <input
                data-testid="current-rent-input"
                type="number"
                min={0}
                step={500}
                dir="ltr"
                className="rent-input rent-mono num-tabular"
                value={input.currentAnnualRentAed}
                onChange={numChange('currentAnnualRentAed')}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">
                {isAr ? 'متوسط مؤشر RERA الرسمي (د.إ)' : 'Official Index Benchmark (AED)'}
              </label>
              <input
                data-testid="index-rent-input"
                type="number"
                min={0}
                step={500}
                dir="ltr"
                className="rent-input rent-mono num-tabular"
                value={input.indexBenchmarkRentAed}
                onChange={numChange('indexBenchmarkRentAed')}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">
                {isAr ? 'الإيجار المقترح للتجديد (د.إ)' : 'Proposed Renewal Rent (AED)'}
              </label>
              <input
                data-testid="proposed-rent-input"
                type="number"
                min={0}
                step={500}
                dir="ltr"
                className="rent-input rent-mono num-tabular"
                value={input.proposedAnnualRentAed}
                onChange={numChange('proposedAnnualRentAed')}
              />
            </div>
          </div>

          {input.emirate === 'abudhabi_adrec' && (
            <div className="mt-3 rounded-xl bg-[var(--bg-elevated)] p-3">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                <input
                  type="checkbox"
                  checked={input.abuDhabiAdrecFreezeActive}
                  onChange={(e) => onChange({ abuDhabiAdrecFreezeActive: e.target.checked })}
                />
                {isAr
                  ? 'تفعيل تجميد مركز أبوظبي العقاري ADREC 0% (مقابل سقف 5% التشريعي)'
                  : 'Abu Dhabi ADREC 0% Rent Index Freeze Active (vs 5% statutory baseline)'}
              </label>
            </div>
          )}

          {input.emirate === 'sharjah_municipality' && (
            <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl bg-[var(--bg-elevated)] p-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[var(--text-secondary)]">
                  {isAr ? 'سنوات العلاقة الإيجارية' : 'Years Into Initial Tenancy'}
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  dir="ltr"
                  className="rent-input rent-mono num-tabular"
                  value={input.yearsIntoInitialTenancy}
                  onChange={numChange('yearsIntoInitialTenancy')}
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[var(--text-secondary)]">
                  {isAr ? 'سنوات منذ آخر زيادة' : 'Years Since Last Increase'}
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  dir="ltr"
                  className="rent-input rent-mono num-tabular"
                  value={input.yearsSinceLastRentIncrease}
                  onChange={numChange('yearsSinceLastRentIncrease')}
                />
              </div>
            </div>
          )}
        </section>

        {/* Card 2: Notice Window, Eviction Ground & Registry Proof */}
        <section className="rent-card rounded-2xl p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <Gavel className="h-4 w-4 text-[var(--accent-primary)]" />
            <h3 className="text-sm font-extrabold text-[var(--text-primary)]">
              {isAr
                ? '2. مهل الإخطار (90 يوماً) وإخلاء الكاتب العدل (12 شهراً)'
                : '2. Notice Delivery SLA, Eviction Ground & Registry'}
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">
                {isAr ? 'وسيلة تبليغ الإخطار' : 'Notice Delivery Channel'}
              </label>
              <select
                data-testid="channel-select"
                className="rent-input"
                value={input.noticeDeliveryChannel}
                onChange={(e) =>
                  onChange({ noticeDeliveryChannel: e.target.value as NoticeDeliveryChannel })
                }
              >
                {(Object.keys(CHANNEL_LABELS) as NoticeDeliveryChannel[]).map((ch) => (
                  <option key={ch} value={ch}>
                    {CHANNEL_LABELS[ch][locale]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">
                {isAr ? 'الأيام المتبقية عند إرسال إخطار الزيادة' : 'Rent Notice Lead Days Served'}
              </label>
              <input
                data-testid="rent-notice-days-input"
                type="number"
                min={0}
                max={3650}
                dir="ltr"
                className="rent-input rent-mono num-tabular"
                value={input.rentNoticeDaysBeforeExpiry}
                onChange={numChange('rentNoticeDaysBeforeExpiry')}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">
                {isAr ? 'سبب طلب الإخلاء (إن وُجد)' : 'Eviction Ground Requested'}
              </label>
              <select
                data-testid="eviction-select"
                className="rent-input"
                value={input.evictionReason}
                onChange={(e) => onChange({ evictionReason: e.target.value as EvictionReason })}
              >
                {(Object.keys(EVICTION_LABELS) as EvictionReason[]).map((ev) => (
                  <option key={ev} value={ev}>
                    {EVICTION_LABELS[ev][locale]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">
                {isAr ? 'مدة إشعار الإخلاء (أيام)' : 'Eviction Notice Days Served'}
              </label>
              <input
                type="number"
                min={0}
                max={3650}
                dir="ltr"
                className="rent-input rent-mono num-tabular"
                value={input.evictionNoticeDaysServed}
                onChange={numChange('evictionNoticeDaysServed')}
              />
            </div>
          </div>

          <div className="mt-3 space-y-2 rounded-xl bg-[var(--bg-elevated)] p-3">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
              <input
                data-testid="registry-checkbox"
                type="checkbox"
                checked={input.contractRegisteredInRegistry}
                onChange={(e) => onChange({ contractRegisteredInRegistry: e.target.checked })}
              />
              {isAr
                ? 'العقد موثق رسمياً في إيجاري / توثيق / بلدية الشارقة'
                : 'Contract registered in Ejari / Tawtheeq / Sharjah Municipality'}
            </label>

            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
              <input
                data-testid="rerent-ban-checkbox"
                type="checkbox"
                checked={input.priorPersonalUseEvictionUnder2Yr3YrBan}
                onChange={(e) =>
                  onChange({ priorPersonalUseEvictionUnder2Yr3YrBan: e.target.checked })
                }
              />
              {isAr
                ? 'إعادة تأجير خلال حظر السنتين (سكني) / 3 سنوات (تجاري) بعد الإخلاء م25/3'
                : 'Unit re-let inside 2yr residential / 3yr commercial ban after personal-use eviction'}
            </label>
          </div>
        </section>
      </div>

      {/* Live 5-Metric Statutory Strip */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rent-card rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-secondary)]">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
            {isAr ? 'السقف الفعلي المسموح' : 'Effective Allowed Cap'}
          </div>
          <div className="rent-mono num-tabular mt-1 text-lg font-extrabold text-[var(--accent-primary)]" dir="ltr">
            {rentEval.effectiveAllowedPct}%
          </div>
        </div>

        <div className="rent-card rounded-xl p-3">
          <div className="text-[11px] font-semibold text-[var(--text-secondary)]">
            {isAr ? 'الحد الأقصى للإيجار' : 'Legal Max Annual Rent'}
          </div>
          <div className="rent-mono num-tabular mt-1 text-lg font-extrabold text-[var(--accent-emerald)]" dir="ltr">
            {Math.round(rentEval.effectiveLegalMaxRentAed).toLocaleString('en-US')} AED
          </div>
        </div>

        <div className="rent-card rounded-xl p-3">
          <div className="text-[11px] font-semibold text-[var(--text-secondary)]">
            {isAr ? 'التجاوز غير النظامي/سنة' : 'Excess Overcharge/yr'}
          </div>
          <div
            className="rent-mono num-tabular mt-1 text-lg font-extrabold"
            dir="ltr"
            style={{
              color:
                rentEval.excessAnnualOverchargeAed > 0
                  ? 'var(--accent-crimson)'
                  : 'var(--accent-emerald)',
            }}
          >
            {Math.round(rentEval.excessAnnualOverchargeAed).toLocaleString('en-US')} AED
          </div>
        </div>

        <div className="rent-card rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-secondary)]">
            <CalendarClock className="h-3.5 w-3.5 text-[var(--accent-teal)]" />
            {isAr ? 'الموعد الأقصى للإخطار' : 'Notice Cutoff Date'}
          </div>
          <div className="rent-mono num-tabular mt-1 text-base font-extrabold text-[var(--text-primary)]" dir="ltr">
            {rentEval.latestNoticeDeadlineDate}
          </div>
        </div>

        <div className="rent-card rounded-xl p-3">
          <div className="text-[11px] font-semibold text-[var(--text-secondary)]">
            {isAr ? 'رسوم RDC التقديرية' : 'Est. RDC Filing Cost'}
          </div>
          <div className="rent-mono num-tabular mt-1 text-lg font-extrabold text-[var(--accent-amber)]" dir="ltr">
            {Math.round(evictionEval.totalEstimatedDisputeCostAed).toLocaleString('en-US')} AED
          </div>
        </div>
      </section>
    </div>
  );
}
