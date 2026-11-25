import { Download, FileSpreadsheet, ShieldAlert } from 'lucide-react';
import { useMemo } from 'react';
import type { UnitCsvAuditSummary } from '../core/types.ts';
import { auditUnitCsv, exportUnitAuditCsv } from '../core/unitCsvAuditor.ts';
import { STATUS_LABELS, type Locale } from '../lib/i18n.ts';

interface Props {
  unitCsv: string;
  locale: Locale;
  onChangeCsv: (next: string) => void;
  onExportSafeCsv: (filename: string, csvContent: string) => void;
}

export function UnitCsvAuditPanel({ unitCsv, locale, onChangeCsv, onExportSafeCsv }: Props) {
  const isAr = locale === 'ar';
  const summary: UnitCsvAuditSummary = useMemo(() => auditUnitCsv(unitCsv), [unitCsv]);

  const handleExport = () => {
    const out = exportUnitAuditCsv(summary);
    onExportSafeCsv('rerarentae-unit-audit.csv', out);
  };

  return (
    <div className="space-y-4">
      <section className="rent-card rounded-2xl p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-[var(--text-primary)]">
              <FileSpreadsheet className="h-4 w-4 text-[var(--accent-primary)]" />
              {isAr
                ? 'مدقق محفظة الوحدات وتحييد حقن الصيغ (CWE-1236)'
                : 'Multi-Unit Tenancy CSV Portfolio Auditor & CWE-1236 Sanitizer'}
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              {isAr
                ? 'يحسب السقف القانوني ومهل الإخطار والتجاوز لكل وحدة مع تعقيم الصيغ الخبيثة وتصدير UTF-8 BOM'
                : 'Audits legal caps, notice validity, and overcharges per unit while neutralizing Excel formulas on UTF-8 BOM export'}
            </p>
          </div>

          <button
            type="button"
            data-testid="export-unit-csv-btn"
            onClick={handleExport}
            disabled={summary.rows.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-3.5 py-2 text-xs font-bold text-[var(--accent-primary-fg)] hover:bg-[var(--accent-primary-hover)] disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            {isAr ? 'تصدير CSV الآمن (UTF-8 BOM)' : 'Export Safe CSV (UTF-8 BOM)'}
          </button>
        </div>

        <textarea
          data-testid="csv-textarea"
          aria-label={isAr ? 'بيانات محفظة الوحدات CSV' : 'Lease portfolio CSV input'}
          dir="ltr"
          rows={5}
          className="rent-input rent-mono text-xs leading-relaxed"
          value={unitCsv}
          onChange={(e) => onChangeCsv(e.target.value)}
        />

        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
          <div className="rounded-xl bg-[var(--bg-elevated)] p-2.5 text-xs">
            <div className="text-[var(--text-secondary)]">{isAr ? 'إجمالي الوحدات' : 'Total Units'}</div>
            <div className="rent-mono num-tabular mt-0.5 text-base font-extrabold" dir="ltr">
              {summary.totalRows}
            </div>
          </div>
          <div className="rounded-xl bg-[var(--bg-elevated)] p-2.5 text-xs">
            <div className="text-[var(--text-secondary)]">{isAr ? 'نظامي / مشروط' : 'Ready / Cond.'}</div>
            <div className="rent-mono num-tabular mt-0.5 text-base font-extrabold text-[var(--accent-emerald)]" dir="ltr">
              {summary.readyCount} / {summary.conditionalCount}
            </div>
          </div>
          <div className="rounded-xl bg-[var(--bg-elevated)] p-2.5 text-xs">
            <div className="text-[var(--text-secondary)]">{isAr ? 'وحدات موقوفة' : 'Blocked Units'}</div>
            <div className="rent-mono num-tabular mt-0.5 text-base font-extrabold text-[var(--accent-crimson)]" dir="ltr">
              {summary.blockedCount}
            </div>
          </div>
          <div className="rounded-xl bg-[var(--bg-elevated)] p-2.5 text-xs">
            <div className="text-[var(--text-secondary)]">{isAr ? 'تجاوز إجمالي/سنة' : 'Total Overcharge'}</div>
            <div className="rent-mono num-tabular mt-0.5 text-base font-extrabold text-[var(--accent-amber)]" dir="ltr">
              {Math.round(summary.totalExcessOverchargeAed).toLocaleString('en-US')} AED
            </div>
          </div>
          <div className="rounded-xl bg-[var(--bg-elevated)] p-2.5 text-xs">
            <div className="text-[var(--text-secondary)]">{isAr ? 'تحييد CWE-1236' : 'CWE-1236 Guard'}</div>
            <div className="rent-mono num-tabular mt-0.5 text-base font-extrabold text-[var(--accent-teal)]" dir="ltr">
              {summary.formulaSanitizedCount}
            </div>
          </div>
        </div>

        {summary.formulaSanitizedCount > 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-[var(--accent-amber)]/40 bg-[var(--accent-amber-soft)] px-3 py-2 text-xs text-[var(--text-primary)]">
            <ShieldAlert className="h-4 w-4 shrink-0 text-[var(--accent-amber)]" />
            <span>
              {isAr
                ? `تم رصد وتحييد ${summary.formulaSanitizedCount} خلية تحتوي على بادئات صيغ Excel الخبيثة قبل الحفظ أو التصدير.`
                : `Detected and safely neutralized ${summary.formulaSanitizedCount} spreadsheet formula payload(s) prior to display and CSV export.`}
            </span>
          </div>
        )}
      </section>

      {summary.rows.length > 0 && (
        <section className="rent-card overflow-x-auto rounded-2xl p-4 sm:p-5">
          <table className="w-full min-w-[680px] border-collapse text-start text-xs">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] text-[var(--text-secondary)]">
                <th className="py-2 pe-3 text-start">{isAr ? 'الوحدة' : 'Unit'}</th>
                <th className="py-2 pe-3 text-start">{isAr ? 'المستأجر' : 'Tenant'}</th>
                <th className="py-2 pe-3 text-start">{isAr ? 'الإمارة' : 'Emirate'}</th>
                <th className="py-2 pe-3 text-start">{isAr ? 'الحالي' : 'Current'}</th>
                <th className="py-2 pe-3 text-start">{isAr ? 'السقف' : 'Legal Max'}</th>
                <th className="py-2 pe-3 text-start">{isAr ? 'المقترح' : 'Proposed'}</th>
                <th className="py-2 pe-3 text-start">{isAr ? 'التجاوز' : 'Excess'}</th>
                <th className="py-2 text-start">{isAr ? 'الحالة' : 'Status'}</th>
              </tr>
            </thead>
            <tbody>
              {summary.rows.map((row) => (
                <tr key={row.rowNumber} className="border-b border-[var(--border-subtle)]/60">
                  <td className="rent-mono py-2 pe-3 font-semibold" dir="ltr">
                    {row.unitCode}
                  </td>
                  <td className="py-2 pe-3">{row.tenantName}</td>
                  <td className="rent-mono py-2 pe-3 text-[11px]" dir="ltr">
                    {row.emirate}
                  </td>
                  <td className="rent-mono num-tabular py-2 pe-3" dir="ltr">
                    {row.currentAnnualRentAed.toLocaleString('en-US')}
                  </td>
                  <td className="rent-mono num-tabular py-2 pe-3 font-bold text-[var(--accent-emerald)]" dir="ltr">
                    {row.effectiveLegalMaxRentAed.toLocaleString('en-US')}
                  </td>
                  <td className="rent-mono num-tabular py-2 pe-3" dir="ltr">
                    {row.proposedAnnualRentAed.toLocaleString('en-US')}
                  </td>
                  <td
                    className="rent-mono num-tabular py-2 pe-3 font-bold"
                    dir="ltr"
                    style={{
                      color:
                        row.excessOverchargeAed > 0
                          ? 'var(--accent-crimson)'
                          : 'var(--accent-emerald)',
                    }}
                  >
                    {row.excessOverchargeAed.toLocaleString('en-US')}
                  </td>
                  <td className="py-2 font-bold">
                    <span
                      style={{
                        color:
                          row.status === 'ready'
                            ? 'var(--accent-emerald)'
                            : row.status === 'conditional'
                              ? 'var(--accent-amber)'
                              : 'var(--accent-crimson)',
                      }}
                    >
                      {STATUS_LABELS[row.status][locale]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
