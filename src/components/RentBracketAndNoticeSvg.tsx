import type { AssessmentInput, AssessmentResult, ReadinessStatus } from '../core/types.ts';
import type { Locale } from '../lib/i18n.ts';

interface Props {
  input: AssessmentInput;
  result: AssessmentResult;
  locale: Locale;
}

function statusStroke(status: ReadinessStatus): string {
  if (status === 'ready') return 'var(--accent-emerald)';
  if (status === 'conditional') return 'var(--accent-amber)';
  return 'var(--accent-crimson)';
}

function fmtAed(val: number, isAr: boolean): string {
  const num = Math.round(val).toLocaleString('en-US');
  return isAr ? `${num} د.إ` : `AED ${num}`;
}

export function RentBracketAndNoticeSvg({ input, result, locale }: Props) {
  const isAr = locale === 'ar';
  const { rentEval, evictionEval, readinessScore, status } = result;

  const trackMaxW = 292;
  const maxRentCompare = Math.max(
    1,
    input.currentAnnualRentAed,
    input.indexBenchmarkRentAed,
    rentEval.effectiveLegalMaxRentAed,
    input.proposedAnnualRentAed,
  );
  const scaleRent = (v: number) =>
    Math.max(8, Math.min(trackMaxW, Math.round((v / maxRentCompare) * trackMaxW)));

  const p1HeadingX = isAr ? 314 : 26;
  const p1MetricX = isAr ? 26 : 314;
  const p1BoxHeadingX = isAr ? 304 : 36;
  const p1BoxMetricX = isAr ? 36 : 304;

  const p2HeadingX = isAr ? 654 : 366;
  const p2MetricX = isAr ? 366 : 654;
  const p2CardHeadingX = isAr ? 644 : 376;
  const p2CardMetricX = isAr ? 376 : 644;

  const barOriginX1 = (w: number) => (isAr ? 316 - w : 24);
  const barOriginX2 = (w: number) => (isAr ? 656 - w : 364);

  // Decree 43/2013 5 brackets across 0..50% below market (x = 24..316, width 292)
  const segW = Math.round(292 / 5);
  const bracketBands = [
    { label: '0%', color: 'var(--accent-emerald-soft)', textColor: 'var(--accent-emerald)' },
    { label: '5%', color: 'var(--accent-teal-soft)', textColor: 'var(--accent-teal)' },
    { label: '10%', color: 'var(--accent-amber-soft)', textColor: 'var(--accent-amber)' },
    { label: '15%', color: 'var(--accent-crimson-soft)', textColor: 'var(--accent-crimson)' },
    { label: '20%', color: 'var(--accent-crimson-soft)', textColor: 'var(--accent-crimson)' },
  ];
  const clampedGap = Math.max(0, Math.min(50, rentEval.pctBelowMarket));
  const pinX = Math.round(24 + (clampedGap / 50) * 292);

  const compareRows = [
    {
      label: isAr ? 'الإيجار الحالي بالعقد' : 'Current Annual Rent',
      value: input.currentAnnualRentAed,
      color: 'var(--accent-teal)',
      y: 138,
    },
    {
      label: isAr ? 'السقف القانوني الفعلي' : 'Effective Legal Max',
      value: rentEval.effectiveLegalMaxRentAed,
      color: 'var(--accent-emerald)',
      y: 186,
    },
    {
      label: isAr ? 'الإيجار المقترح للتجديد' : 'Proposed Renewal Rent',
      value: input.proposedAnnualRentAed,
      color:
        rentEval.excessAnnualOverchargeAed > 0
          ? 'var(--accent-crimson)'
          : 'var(--accent-primary)',
      y: 234,
    },
  ];

  const readinessW = Math.max(6, Math.min(292, Math.round((readinessScore / 100) * 292)));
  const implementedCount = result.controls.filter((c) => c.implemented).length;

  const evictionBadge = !evictionEval.evictionRequested
    ? isAr
      ? 'لا يوجد إخلاء'
      : 'NO EVICTION'
    : evictionEval.evictionNoticeValid
      ? isAr
        ? '12 شهراً موثق'
        : '12M NOTARY OK'
      : isAr
        ? 'إخلاء غير نظامي'
        : 'INVALID EVICTION';

  const gateCards = [
    {
      label: isAr
        ? `مهلة الإخطار (${rentEval.requiredNoticeDays} يوماً)`
        : `Rent Notice SLA (${rentEval.requiredNoticeDays}d)`,
      badge: rentEval.noticeValidForHike
        ? isAr
          ? 'صالح للزيادة'
          : 'SLA VALID'
        : isAr
          ? 'باطل (0% سقف)'
          : 'INVALID (0% CAP)',
      ok: rentEval.noticeValidForHike || input.proposedAnnualRentAed <= input.currentAnnualRentAed,
      y: 158,
    },
    {
      label: isAr ? 'إخلاء الكاتب العدل وحظر م25/3' : 'Art. 25(2) Notary & Re-Rent Ban',
      badge: evictionBadge,
      ok: evictionEval.evictionNoticeValid && !evictionEval.reRentBanViolationActive,
      y: 204,
    },
    {
      label: isAr ? 'الفائض السنوي غير القانوني' : 'Excess Annual Overcharge',
      badge: fmtAed(rentEval.excessAnnualOverchargeAed, isAr),
      ok: rentEval.excessAnnualOverchargeAed === 0,
      y: 250,
    },
  ];

  return (
    <section className="rent-card rounded-2xl p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            {isAr
              ? 'مؤشر شرائح مرسوم 43/2013 ومهل 90 يوماً وإخلاء الكاتب العدل 12 شهراً'
              : 'UAE Rental Brackets (Decree 43/2013), 90d Notice & 12m Notary Eviction Telemetry'}
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            {isAr
              ? 'مقارنة الإيجار الحالي بالسقف النظامي بعد فحص الإخطار والفرق عن المؤشر الرسمي، ورسوم RDC التقديرية 3.5%'
              : 'Benchmarks renewal rent against RERA Smart Index / ADREC 0% Freeze / Sharjah 3yr-5yr lock and RDC 3.5% filing cost'}
          </p>
        </div>
        <span
          className="rent-mono num-tabular rounded-full border px-3 py-1 text-xs font-bold"
          dir="ltr"
          style={{
            borderColor: statusStroke(status),
            color: statusStroke(status),
            backgroundColor: 'var(--bg-elevated)',
          }}
        >
          {status.toUpperCase()} · {readinessScore}/100
        </span>
      </div>

      <svg
        viewBox="0 0 680 315"
        direction={isAr ? 'rtl' : 'ltr'}
        role="img"
        aria-label={
          isAr
            ? 'مخطط شرائح زيادة الإيجار ومهل الإخطار الإماراتي'
            : 'UAE Rental Increase Bracket & Notice SLA Chart'
        }
        className="w-full rounded-xl bg-[var(--bg-elevated)]/60"
      >
        {/* Left Panel */}
        <rect
          x="12"
          y="12"
          width="316"
          height="291"
          rx="12"
          fill="var(--bg-surface)"
          stroke="var(--border-subtle)"
        />
        <text
          x={p1HeadingX}
          y="36"
          fontSize="11.5"
          fontWeight="700"
          fill="var(--text-primary)"
          textAnchor="start"
        >
          {isAr ? '1. شرائح الزيادة والسقف' : '1. Decree 43 Cap & Rent'}
        </text>
        <text
          x={p1MetricX}
          y="36"
          fontSize="10.5"
          fontWeight="700"
          fill="var(--accent-primary)"
          textAnchor="end"
        >
          {isAr
            ? `فجوة ${rentEval.pctBelowMarket.toFixed(1)}% · سقف ${rentEval.effectiveAllowedPct}%`
            : `${rentEval.pctBelowMarket.toFixed(1)}% gap · Max ${rentEval.effectiveAllowedPct}%`}
        </text>

        {/* 5 Decree 43 Bracket Bands — kept explicitly LTR along the numeric gap axis */}
        <g direction="ltr">
          {bracketBands.map((band, idx) => (
            <g key={band.label}>
              <rect
                x={24 + idx * segW}
                y="52"
                width={idx === 4 ? 292 - 4 * segW : segW - 1}
                height="18"
                rx="3"
                fill={band.color}
              />
              <text
                x={24 + idx * segW + segW / 2}
                y="64"
                fontSize="9.5"
                fontWeight="700"
                fill={band.textColor}
                textAnchor="middle"
              >
                {band.label}
              </text>
            </g>
          ))}

          {/* Pin on Gap % */}
          <line
            x1={pinX}
            y1="47"
            x2={pinX}
            y2="76"
            stroke="var(--text-primary)"
            strokeWidth="2.5"
          />
          <circle cx={pinX} cy="47" r="4" fill="var(--accent-primary)" />
          <text x="24" y="88" fontSize="9.5" fill="var(--text-secondary)" textAnchor="start">
            0%..10%
          </text>
          <text x="170" y="88" fontSize="9.5" fill="var(--accent-amber)" textAnchor="middle">
            20%..30%
          </text>
          <text x="316" y="88" fontSize="9.5" fill="var(--accent-crimson)" textAnchor="end">
            40%+ (Cap 20%)
          </text>
        </g>

        {/* Horizontal Rent Comparison Bars */}
        {compareRows.map((row) => {
          const w = scaleRent(row.value);
          return (
            <g key={row.label}>
              <text
                x={p1HeadingX}
                y={row.y}
                fontSize="11"
                fontWeight="600"
                fill="var(--text-primary)"
                textAnchor="start"
              >
                {row.label}
              </text>
              <text
                x={p1MetricX}
                y={row.y}
                fontSize="11"
                fontWeight="700"
                fill={row.color}
                textAnchor="end"
              >
                {fmtAed(row.value, isAr)}
              </text>
              <rect x="24" y={row.y + 8} width="292" height="14" rx="7" fill="var(--bg-elevated)" />
              <rect x={barOriginX1(w)} y={row.y + 8} width={w} height="14" rx="7" fill={row.color} />
            </g>
          );
        })}

        {/* Summary footer box */}
        <rect
          x="24"
          y="264"
          width="292"
          height="28"
          rx="8"
          fill="var(--bg-soft)"
          stroke="var(--border-subtle)"
        />
        <text
          x={p1BoxHeadingX}
          y="282"
          fontSize="10.5"
          fontWeight="600"
          fill="var(--text-primary)"
          textAnchor="start"
        >
          {isAr ? 'رسوم قيد RDC التقديرية' : 'Est. Dubai RDC Filing Cost'}
        </text>
        <text
          x={p1BoxMetricX}
          y="282"
          fontSize="11"
          fontWeight="700"
          fill="var(--accent-primary)"
          textAnchor="end"
        >
          {fmtAed(evictionEval.totalEstimatedDisputeCostAed, isAr)}
        </text>

        {/* Right Panel */}
        <rect
          x="352"
          y="12"
          width="316"
          height="291"
          rx="12"
          fill="var(--bg-surface)"
          stroke="var(--border-subtle)"
        />
        <text
          x={p2HeadingX}
          y="36"
          fontSize="11.5"
          fontWeight="700"
          fill="var(--text-primary)"
          textAnchor="start"
        >
          {isAr ? '2. مهلة الإخطار والإخلاء (6 ضوابط)' : '2. Notice SLA & Eviction Score'}
        </text>
        <text
          x={p2MetricX}
          y="36"
          fontSize="11"
          fontWeight="700"
          fill={statusStroke(status)}
          textAnchor={isAr ? 'start' : 'end'}
          direction="ltr"
        >
          {implementedCount}/6 · {readinessScore}%
        </text>

        {/* Readiness Bar */}
        <rect x="364" y="54" width="292" height="16" rx="8" fill="var(--bg-elevated)" />
        <rect
          x={barOriginX2(readinessW)}
          y="54"
          width={readinessW}
          height="16"
          rx="8"
          fill={statusStroke(status)}
        />
        <text
          x={p2HeadingX}
          y="92"
          fontSize="10.5"
          fill="var(--text-secondary)"
          textAnchor="start"
        >
          {isAr ? 'آخر موعد للإخطار' : 'Notice Cutoff Date'}
        </text>
        <text
          x={p2MetricX}
          y="92"
          fontSize="11"
          fontWeight="700"
          fill="var(--text-primary)"
          textAnchor={isAr ? 'start' : 'end'}
          direction="ltr"
        >
          {rentEval.latestNoticeDeadlineDate}
        </text>

        {/* Statutory Gate Cards */}
        {gateCards.map((card) => (
          <g key={card.label}>
            <rect
              x="364"
              y={card.y - 22}
              width="292"
              height="36"
              rx="9"
              fill={card.ok ? 'var(--accent-emerald-soft)' : 'var(--accent-crimson-soft)'}
              stroke={card.ok ? 'var(--accent-emerald)' : 'var(--accent-crimson)'}
              strokeOpacity="0.45"
            />
            <text
              x={p2CardHeadingX}
              y={card.y}
              fontSize="10.5"
              fontWeight="600"
              fill="var(--text-primary)"
              textAnchor="start"
            >
              {card.label}
            </text>
            <text
              x={p2CardMetricX}
              y={card.y}
              fontSize="10.5"
              fontWeight="700"
              fill={card.ok ? 'var(--accent-emerald)' : 'var(--accent-crimson)'}
              textAnchor="end"
            >
              {card.badge}
            </text>
          </g>
        ))}

        <text
          x={p2HeadingX}
          y="290"
          fontSize="10"
          fill="var(--text-secondary)"
          textAnchor="start"
        >
          {isAr
            ? `الفجوات النشطة: ${result.activeGapCount} | قفل الشارقة: ${rentEval.sharjahLockYearsRemaining} سنة`
            : `Active Gaps: ${result.activeGapCount} | Sharjah Lock: ${rentEval.sharjahLockYearsRemaining}y`}
        </text>
      </svg>
    </section>
  );
}
