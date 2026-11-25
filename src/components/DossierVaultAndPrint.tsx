import {
  Copy,
  Download,
  ExternalLink,
  FileText,
  Lock,
  Printer,
  Save,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import type { AssessmentResult } from '../core/types.ts';
import type { ReraRentDossierRecord } from '../lib/api.ts';
import { STATUS_LABELS, type Locale } from '../lib/i18n.ts';

interface Props {
  dossiers: ReraRentDossierRecord[];
  liveResult: AssessmentResult;
  locale: Locale;
  busyAction: string | null;
  onSaveDraft: (title: string) => void;
  onFinalize: (record: ReraRentDossierRecord) => void;
  onDuplicate: (record: ReraRentDossierRecord) => void;
  onDelete: (record: ReraRentDossierRecord) => void;
  onDownloadBrief: (record: ReraRentDossierRecord) => void;
  onDownloadCsv: (record: ReraRentDossierRecord) => void;
  onOpenPublic: (slugOrCode: string) => void;
  onCopyPublicUrl: (slugOrCode: string) => void;
}

export function DossierVaultAndPrint({
  dossiers,
  liveResult,
  locale,
  busyAction,
  onSaveDraft,
  onFinalize,
  onDuplicate,
  onDelete,
  onDownloadBrief,
  onDownloadCsv,
  onOpenPublic,
  onCopyPublicUrl,
}: Props) {
  const isAr = locale === 'ar';
  const [title, setTitle] = useState('');

  return (
    <div className="space-y-4">
      <section className="rent-card no-print rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-[240px] flex-1">
            <label
              htmlFor="dossier-title"
              className="mb-1 block text-xs font-bold text-[var(--text-secondary)]"
            >
              {isAr
                ? 'حفظ ملف تدقيق إيجاري جديد (RNT-YYYY-0001 + بصمة SHA-256)'
                : 'Save New Rental Readiness Dossier (RNT-YYYY-0001 + SHA-256)'}
            </label>
            <input
              id="dossier-title"
              type="text"
              className="rent-input"
              placeholder={`${liveResult.partyName} — ${liveResult.unitReference}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="save-draft-btn"
              disabled={busyAction === 'save'}
              onClick={() => {
                onSaveDraft(title);
                setTitle('');
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-xs font-bold text-[var(--accent-primary-fg)] hover:bg-[var(--accent-primary-hover)] disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              {isAr ? 'حفظ المسودة' : 'Save Draft'}
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3.5 py-2 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
            >
              <Printer className="h-3.5 w-3.5" />
              {isAr ? 'طباعة A4 PDF' : 'Print A4 PDF'}
            </button>
          </div>
        </div>
      </section>

      <section className="rent-card rounded-2xl p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-[var(--text-primary)]">
            {isAr ? 'خزنة ملفات الإيجار المختومة والمسودات' : 'Rental Dossier Vault'}
          </h3>
          <span className="rent-mono num-tabular rounded-lg bg-[var(--bg-elevated)] px-2.5 py-1 text-xs font-bold text-[var(--text-secondary)]">
            {dossiers.length}
          </span>
        </div>

        {dossiers.length === 0 ? (
          <p className="rounded-xl bg-[var(--bg-elevated)] p-4 text-xs text-[var(--text-secondary)]">
            {isAr
              ? 'لا توجد ملفات محفوظة بعد. اضغط «حفظ المسودة» لترقيم ملف RNT-YYYY-0001 وختمه ببصمة SHA-256.'
              : 'No saved dossiers yet. Click "Save Draft" to allocate RNT-YYYY-0001 and stamp its SHA-256 digest.'}
          </p>
        ) : (
          <div className="space-y-3">
            {dossiers.map((rec) => {
              const isLocked = Boolean(rec.lockedAt);
              return (
                <article
                  key={rec.dossierCode}
                  data-testid={`dossier-card-${rec.dossierCode}`}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rent-mono text-xs font-extrabold text-[var(--accent-primary)]" dir="ltr">
                          {rec.dossierCode}
                        </span>
                        <span className="text-xs font-bold text-[var(--text-primary)]">
                          {rec.title}
                        </span>
                        {isLocked && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-emerald-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--accent-emerald)]">
                            <Lock className="h-3 w-3" />
                            {isAr ? 'مختوم غير قابل للتعديل' : 'Sealed'}
                          </span>
                        )}
                      </div>
                      <div className="rent-mono mt-1 flex flex-wrap gap-3 text-[11px] text-[var(--text-secondary)]" dir="ltr">
                        <span>{STATUS_LABELS[rec.status][locale]}</span>
                        <span>Score: {rec.readinessScore}/100</span>
                        <span>Cap: {rec.effectiveAllowedPct}%</span>
                        <span>Overcharge: {Math.round(rec.excessOverchargeAed).toLocaleString('en-US')} AED</span>
                        <span>SHA: {rec.dossierSha256.slice(0, 12)}…</span>
                      </div>
                    </div>

                    <div className="no-print flex flex-wrap items-center gap-1.5">
                      {!isLocked && (
                        <button
                          type="button"
                          data-testid={`finalize-${rec.dossierCode}`}
                          disabled={busyAction === rec.dossierCode}
                          onClick={() => onFinalize(rec)}
                          className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent-emerald)] px-2.5 py-1.5 text-[11px] font-bold text-white hover:opacity-90 disabled:opacity-50"
                        >
                          <Lock className="h-3 w-3" />
                          {isAr ? 'اعتماد وختم' : 'Finalize & Seal'}
                        </button>
                      )}

                      {isLocked && rec.publicSlug && (
                        <>
                          <button
                            type="button"
                            data-testid={`open-public-${rec.dossierCode}`}
                            onClick={() => onOpenPublic(rec.publicSlug!)}
                            className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent-teal)] px-2.5 py-1.5 text-[11px] font-bold text-white hover:opacity-90"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {isAr ? 'فتح الرابط العام' : 'Open Public /r'}
                          </button>
                          <button
                            type="button"
                            onClick={() => onCopyPublicUrl(rec.publicSlug!)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--text-primary)]"
                          >
                            <Copy className="h-3 w-3" />
                            {isAr ? 'نسخ الرابط' : 'Copy Link'}
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        data-testid={`brief-${rec.dossierCode}`}
                        onClick={() => onDownloadBrief(rec)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--text-primary)]"
                      >
                        <FileText className="h-3 w-3" />
                        Brief .md
                      </button>

                      <button
                        type="button"
                        data-testid={`csv-${rec.dossierCode}`}
                        onClick={() => onDownloadCsv(rec)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--text-primary)]"
                      >
                        <Download className="h-3 w-3" />
                        CSV
                      </button>

                      <button
                        type="button"
                        onClick={() => onDuplicate(rec)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--text-primary)]"
                      >
                        {isAr ? 'تكرار' : 'Clone'}
                      </button>

                      {!isLocked && (
                        <button
                          type="button"
                          onClick={() => onDelete(rec)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--accent-crimson)]/40 bg-[var(--accent-crimson-soft)] px-2 py-1.5 text-[11px] font-bold text-[var(--accent-crimson)]"
                          aria-label={isAr ? 'حذف المسودة' : 'Delete draft'}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
