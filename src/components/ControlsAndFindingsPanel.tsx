import { AlertOctagon, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { RENT_CONTROLS } from '../core/rentCatalog.ts';
import type { AssessmentResult, RentControlId, SeverityLevel } from '../core/types.ts';
import { SEVERITY_LABELS, type Locale } from '../lib/i18n.ts';

interface Props {
  result: AssessmentResult;
  implementedControls: readonly RentControlId[];
  locale: Locale;
  onToggleControl: (id: RentControlId) => void;
  onSelectAllControls: () => void;
}

function severityStyle(sev: SeverityLevel) {
  if (sev === 'blocker') {
    return {
      border: 'var(--accent-crimson)',
      bg: 'var(--accent-crimson-soft)',
      text: 'var(--accent-crimson)',
      Icon: AlertOctagon,
    };
  }
  if (sev === 'warning') {
    return {
      border: 'var(--accent-amber)',
      bg: 'var(--accent-amber-soft)',
      text: 'var(--accent-amber)',
      Icon: AlertTriangle,
    };
  }
  return {
    border: 'var(--accent-teal)',
    bg: 'var(--accent-teal-soft)',
    text: 'var(--accent-teal)',
    Icon: Info,
  };
}

export function ControlsAndFindingsPanel({
  result,
  implementedControls,
  locale,
  onToggleControl,
  onSelectAllControls,
}: Props) {
  const isAr = locale === 'ar';
  const implementedSet = new Set(implementedControls);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <section className="rent-card rounded-2xl p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-[var(--text-primary)]">
              {isAr
                ? 'مصفوفة ضوابط الامتثال الإيجاري الستة (100 نقطة)'
                : 'Six UAE Tenancy Governance Controls (100 Points)'}
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              {isAr
                ? 'فعّل الضوابط الموثقة لتحديث درجة الجاهزية وحفظ بصمة SHA-256'
                : 'Toggle verified legal controls to update readiness score'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="select-all-controls-btn"
              onClick={onSelectAllControls}
              className="rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2.5 py-1 text-[11px] font-bold text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
            >
              {isAr ? 'تفعيل الكل' : 'Select All'}
            </button>
            <span
              className="rent-mono num-tabular rounded-lg bg-[var(--bg-elevated)] px-2.5 py-1 text-xs font-bold text-[var(--accent-primary)]"
              dir="ltr"
            >
              {result.readinessScore}/100
            </span>
          </div>
        </div>

        <div className="space-y-2.5">
          {RENT_CONTROLS.map((ctrl) => {
            const active = implementedSet.has(ctrl.id);
            return (
              <button
                key={ctrl.id}
                type="button"
                data-testid={`control-${ctrl.id}`}
                aria-pressed={active}
                onClick={() => onToggleControl(ctrl.id)}
                className="w-full rounded-xl border p-3 text-start transition-colors"
                style={{
                  borderColor: active ? 'var(--accent-emerald)' : 'var(--border-subtle)',
                  backgroundColor: active ? 'var(--accent-emerald-soft)' : 'var(--bg-elevated)',
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0"
                      style={{
                        color: active ? 'var(--accent-emerald)' : 'var(--text-secondary)',
                      }}
                    />
                    <div>
                      <div className="text-xs font-bold text-[var(--text-primary)]">
                        <span className="rent-mono me-1.5 text-[11px] text-[var(--accent-primary)]" dir="ltr">
                          {ctrl.id}
                        </span>
                        {isAr ? ctrl.titleAr : ctrl.titleEn}
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                        {isAr ? ctrl.descriptionAr : ctrl.descriptionEn}
                      </p>
                    </div>
                  </div>
                  <span
                    className="rent-mono num-tabular shrink-0 rounded-md bg-[var(--bg-surface)] px-2 py-0.5 text-[11px] font-bold text-[var(--text-secondary)]"
                    dir="ltr"
                  >
                    {ctrl.weight} pts
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rent-card rounded-2xl p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-[var(--text-primary)]">
              {isAr ? 'النتائج القانونية والفجوات المرصودة' : 'Statutory Findings & Remediation Notes'}
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              {isAr
                ? 'تصنيف تلقائي للعوائق والتنبيهات وفق مرسوم 43/2013 وقانون 33/2008 وADREC والشارقة 5/2024'
                : 'Automated statutory blocker/warning classification across UAE tenancy laws'}
            </p>
          </div>
          <span className="rent-mono num-tabular rounded-lg bg-[var(--bg-elevated)] px-2.5 py-1 text-xs font-bold text-[var(--text-secondary)]">
            {result.findings.length}
          </span>
        </div>

        <div className="space-y-2.5">
          {result.findings.map((finding) => {
            const st = severityStyle(finding.severity);
            const IconComp = st.Icon;
            return (
              <article
                key={finding.code}
                className="rounded-xl border p-3"
                style={{ borderColor: st.border, backgroundColor: st.bg }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold" style={{ color: st.text }}>
                    <IconComp className="h-4 w-4 shrink-0" />
                    <span>{SEVERITY_LABELS[finding.severity][locale]}</span>
                    <span className="rent-mono text-[11px] opacity-80" dir="ltr">
                      · {finding.code}
                    </span>
                  </div>
                  <span
                    className="rent-mono rounded bg-[var(--bg-surface)]/80 px-2 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)]"
                    dir="ltr"
                  >
                    {finding.legalRef}
                  </span>
                </div>
                <h4 className="mt-1.5 text-xs font-bold text-[var(--text-primary)]">
                  {isAr ? finding.titleAr : finding.titleEn}
                </h4>
                <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                  {isAr ? finding.detailAr : finding.detailEn}
                </p>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
