import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Database,
  FileCheck2,
  Globe,
  Moon,
  Printer,
  Sun,
} from 'lucide-react';
import { ControlsAndFindingsPanel } from './components/ControlsAndFindingsPanel.tsx';
import { DossierVaultAndPrint } from './components/DossierVaultAndPrint.tsx';
import { RentAndEvictionPanel } from './components/RentAndEvictionPanel.tsx';
import { RentBracketAndNoticeSvg } from './components/RentBracketAndNoticeSvg.tsx';
import { UnitCsvAuditPanel } from './components/UnitCsvAuditPanel.tsx';
import { RENT_PRESETS } from './core/presets.ts';
import { assessReraRentReadiness, evaluateReraRentCoreSync } from './core/readinessAssessor.ts';
import { RENT_CONTROLS, RERARENTAE_TOOL_VERSION } from './core/rentCatalog.ts';
import type { AssessmentInput, AssessmentResult, RentControlId } from './core/types.ts';
import {
  type ApiMode,
  type PublicReraRentReport,
  type ReraRentDossierRecord,
  deleteDossier,
  detectServerMode,
  duplicateDossier,
  fetchBriefMarkdown,
  fetchExportCsv,
  fetchPublicReport,
  finalizeDossier,
  listDossiers,
  saveDossier,
} from './lib/api.ts';
import { stripBase, withBase } from './lib/basePath.ts';
import { EMIRATE_LABELS, STATUS_LABELS, UI_COPY, type Locale, type ThemeName } from './lib/i18n.ts';

type StudioTab = 'dashboard' | 'controls' | 'csv' | 'vault';

const LS_LOCALE = 'rerarentae.v1.locale';
const LS_THEME = 'rerarentae.v1.theme';

function getInitialLocale(): Locale {
  try {
    const saved = localStorage.getItem(LS_LOCALE);
    if (saved === 'en' || saved === 'ar') return saved;
  } catch {
    // Ignore storage read errors
  }
  return 'ar';
}

function getInitialTheme(): ThemeName {
  try {
    const saved = localStorage.getItem(LS_THEME);
    if (saved === 'alabaster-dld' || saved === 'slate-night') return saved;
  } catch {
    // Ignore storage read errors
  }
  return 'alabaster-dld';
}

function parsePublicSlugFromLocation(): string | null {
  if (typeof window === 'undefined') return null;
  const rel = stripBase(window.location.pathname);
  const match = rel.match(/^\/r\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]!) : null;
}

function triggerFileDownload(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [locale, setLocale] = useState<Locale>(getInitialLocale);
  const [theme, setTheme] = useState<ThemeName>(getInitialTheme);
  const [mode, setMode] = useState<ApiMode>('local');
  const [activeTab, setActiveTab] = useState<StudioTab>('dashboard');
  const [selectedPresetId, setSelectedPresetId] = useState<string>(RENT_PRESETS[0]!.id);
  const [input, setInput] = useState<AssessmentInput>(() =>
    structuredClone(RENT_PRESETS[0]!.input),
  );
  const [shaDigest, setShaDigest] = useState<string>('');
  const [canonicalText, setCanonicalText] = useState<string>('');
  const [dossiers, setDossiers] = useState<ReraRentDossierRecord[]>([]);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [publicSlugRoute, setPublicSlugRoute] = useState<string | null>(() =>
    parsePublicSlugFromLocation(),
  );
  const [publicReportState, setPublicReportState] = useState<{
    loading: boolean;
    error: string | null;
    data: PublicReraRentReport | null;
  }>({ loading: false, error: null, data: null });

  const copy = UI_COPY[locale];
  const isAr = locale === 'ar';

  const syncCore = useMemo(() => evaluateReraRentCoreSync(input), [input]);
  const liveResult: AssessmentResult = useMemo(
    () => ({
      ...syncCore,
      canonicalDossierText: canonicalText,
      dossierSha256: shaDigest,
    }),
    [syncCore, canonicalText, shaDigest],
  );

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    try {
      localStorage.setItem(LS_LOCALE, locale);
    } catch {
      // Ignore storage write errors
    }
  }, [locale]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', theme === 'slate-night' ? '#08111E' : '#F8F9F7');
    }
    try {
      localStorage.setItem(LS_THEME, theme);
    } catch {
      // Ignore storage write errors
    }
  }, [theme]);

  useEffect(() => {
    let active = true;
    void assessReraRentReadiness(input).then((res) => {
      if (active) {
        setShaDigest(res.dossierSha256);
        setCanonicalText(res.canonicalDossierText);
      }
    });
    return () => {
      active = false;
    };
  }, [input]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const detected = await detectServerMode();
      if (!mounted) return;
      setMode(detected);
      try {
        const items = await listDossiers(detected);
        if (mounted) setDossiers(items);
      } catch {
        // Ignore initial fetch errors
      }
    })();

    const onPop = () => {
      setPublicSlugRoute(parsePublicSlugFromLocation());
    };
    window.addEventListener('popstate', onPop);
    return () => {
      mounted = false;
      window.removeEventListener('popstate', onPop);
    };
  }, []);

  useEffect(() => {
    if (!publicSlugRoute) return;
    let active = true;
    setPublicReportState({ loading: true, error: null, data: null });
    void (async () => {
      const detected = await detectServerMode();
      if (!active) return;
      setMode(detected);
      try {
        const rep = await fetchPublicReport(detected, publicSlugRoute);
        if (active) setPublicReportState({ loading: false, error: null, data: rep });
      } catch (err) {
        if (active) {
          setPublicReportState({
            loading: false,
            error: err instanceof Error ? err.message : copy.missingReport,
            data: null,
          });
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [publicSlugRoute, copy.missingReport]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const handleSelectPreset = (presetId: string) => {
    const found = RENT_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setSelectedPresetId(found.id);
    setInput(structuredClone(found.input));
  };

  const handleInputPatch = (patch: Partial<AssessmentInput>) => {
    setInput((prev) => ({ ...prev, ...patch }));
  };

  const handleToggleControl = (id: RentControlId) => {
    setInput((prev) => {
      const exists = prev.implementedControls.includes(id);
      const next = exists
        ? prev.implementedControls.filter((c) => c !== id)
        : [...prev.implementedControls, id];
      return { ...prev, implementedControls: next };
    });
  };

  const handleSelectAllControls = () => {
    setInput((prev) => ({
      ...prev,
      implementedControls: RENT_CONTROLS.map((c) => c.id),
    }));
  };

  const refreshDossiers = async (targetMode: ApiMode = mode) => {
    const items = await listDossiers(targetMode);
    setDossiers(items);
  };

  const handleSaveDraft = async (title: string) => {
    setBusyAction('save');
    try {
      const saved = await saveDossier(mode, input, title);
      await refreshDossiers();
      showToast(
        isAr ? `تم حفظ المسودة ${saved.dossierCode}` : `Saved draft ${saved.dossierCode}`,
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusyAction(null);
    }
  };

  const handleFinalize = async (record: ReraRentDossierRecord) => {
    setBusyAction(record.dossierCode);
    try {
      const sealed = await finalizeDossier(mode, record);
      await refreshDossiers();
      showToast(
        isAr
          ? `تم ختم الملف ${sealed.dossierCode} بنجاح`
          : `Finalized & sealed ${sealed.dossierCode}`,
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Finalize failed');
    } finally {
      setBusyAction(null);
    }
  };

  const handleDuplicate = async (record: ReraRentDossierRecord) => {
    setBusyAction(record.dossierCode);
    try {
      const dup = await duplicateDossier(mode, record);
      await refreshDossiers();
      showToast(
        isAr ? `تم استنساخ الملف ${dup.dossierCode}` : `Cloned dossier ${dup.dossierCode}`,
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Duplicate failed');
    } finally {
      setBusyAction(null);
    }
  };

  const handleDelete = async (record: ReraRentDossierRecord) => {
    setBusyAction(record.dossierCode);
    try {
      await deleteDossier(mode, record);
      await refreshDossiers();
      showToast(isAr ? `تم حذف المسودة ${record.dossierCode}` : `Deleted ${record.dossierCode}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusyAction(null);
    }
  };

  const handleDownloadBrief = async (record: ReraRentDossierRecord) => {
    try {
      const md = await fetchBriefMarkdown(mode, record, locale);
      triggerFileDownload(`${record.dossierCode}.${locale}.brief.md`, md, 'text/markdown;charset=utf-8');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Brief export failed');
    }
  };

  const handleDownloadCsv = async (record: ReraRentDossierRecord) => {
    try {
      const csv = await fetchExportCsv(mode, record);
      triggerFileDownload(`${record.dossierCode}.unit-audit.csv`, csv, 'text/csv;charset=utf-8');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'CSV export failed');
    }
  };

  const openPublicReportRoute = (slugOrCode: string) => {
    const targetUrl = withBase(`/r/${encodeURIComponent(slugOrCode)}`);
    window.history.pushState({}, '', targetUrl);
    setPublicSlugRoute(slugOrCode);
  };

  const exitPublicReportRoute = () => {
    window.history.pushState({}, '', withBase('/'));
    setPublicSlugRoute(null);
    setPublicReportState({ loading: false, error: null, data: null });
  };

  const handleCopyPublicUrl = async (slugOrCode: string) => {
    const shareUrl = new URL(withBase(`/r/${slugOrCode}`), window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast(isAr ? 'تم نسخ رابط التقرير المختوم' : 'Copied sealed report URL');
    } catch {
      showToast(shareUrl);
    }
  };

  const statusColor =
    liveResult.status === 'ready'
      ? 'var(--accent-emerald)'
      : liveResult.status === 'conditional'
        ? 'var(--accent-amber)'
        : 'var(--accent-crimson)';

  if (publicSlugRoute) {
    const rep = publicReportState.data?.report;
    return (
      <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="no-print flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={exitPublicReportRoute}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3.5 py-2 text-xs font-bold text-[var(--text-primary)]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {copy.backToStudio}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLocale((prev) => (prev === 'ar' ? 'en' : 'ar'))}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-bold"
              >
                <Globe className="h-3.5 w-3.5" />
                {copy.langSwitch}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-3.5 py-1.5 text-xs font-bold text-[var(--accent-primary-fg)]"
              >
                <Printer className="h-3.5 w-3.5" />
                {copy.printPdf}
              </button>
            </div>
          </div>

          {publicReportState.loading && (
            <div className="rent-card rounded-2xl p-6 text-sm">{copy.loadingReport}</div>
          )}

          {publicReportState.error && (
            <div className="rent-card rounded-2xl border-[var(--accent-crimson)] p-6 text-sm text-[var(--accent-crimson)]">
              {publicReportState.error}
            </div>
          )}

          {rep && publicReportState.data && (
            <div className="space-y-4">
              <section className="rent-card rounded-2xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileCheck2 className="h-5 w-5 text-[var(--accent-primary)]" />
                      <h1 className="text-lg font-extrabold text-[var(--text-primary)]">
                        {copy.publicSealTitle} —{' '}
                        <span className="rent-mono" dir="ltr">
                          {rep.dossierCode}
                        </span>
                      </h1>
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      {rep.partyName} ·{' '}
                      <span className="rent-mono" dir="ltr">
                        {rep.unitReference}
                      </span>{' '}
                      · {EMIRATE_LABELS[rep.emirate][locale]}
                    </p>
                  </div>
                  <div className="rent-mono text-xs text-[var(--text-secondary)]" dir="ltr">
                    {copy.viewsCount}:{' '}
                    <strong data-testid="public-view-count">{publicReportState.data.viewCount}</strong>{' '}
                    · {rep.status.toUpperCase()} ({rep.readinessScore}/100)
                  </div>
                </div>

                <div className="mt-3 rounded-xl bg-[var(--bg-elevated)] p-3 text-[11px] text-[var(--text-secondary)]">
                  <div>
                    <strong>{copy.sealedAt}</strong>{' '}
                    <span className="rent-mono" dir="ltr">
                      {rep.lockedAt}
                    </span>
                  </div>
                  <div className="mt-1 break-all">
                    <strong>{copy.shaDigest}</strong>{' '}
                    <span className="rent-mono" dir="ltr">
                      {rep.dossierSha256}
                    </span>
                  </div>
                </div>

                <div className="mt-3 rounded-xl border border-[var(--accent-amber)]/35 bg-[var(--accent-amber-soft)] p-3 text-xs text-[var(--text-primary)]">
                  {isAr ? rep.legalDisclaimerAr : rep.legalDisclaimerEn}
                </div>
              </section>

              <section className="rent-card rounded-2xl p-5">
                <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-[var(--text-primary)]">
                  {isAr ? rep.briefAr : rep.briefEn}
                </pre>
              </section>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <main className="mx-auto max-w-6xl space-y-4">
        {/* Clean Top Header (non-sticky) */}
        <header className="rent-card rounded-2xl p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent-primary)] text-[var(--accent-primary-fg)]">
                  <Building2 className="h-4 w-4" />
                </span>
                <h1 className="text-lg font-extrabold tracking-tight text-[var(--text-primary)] sm:text-xl">
                  {copy.brandTitle}
                </h1>
                <span
                  className="rent-mono rounded-full bg-[var(--bg-elevated)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--text-secondary)]"
                  dir="ltr"
                >
                  v{RERARENTAE_TOOL_VERSION}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">{copy.brandSubtitle}</p>
            </div>

            <div className="no-print flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--bg-elevated)] px-3 py-1.5 text-[11px] font-bold text-[var(--text-secondary)]"
                data-testid="mode-badge"
              >
                <Database className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
                {mode === 'server' ? copy.modeServer : copy.modeLocal}
              </span>

              <span
                data-testid="status-badge"
                className="rent-mono num-tabular inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-extrabold"
                style={{
                  borderColor: statusColor,
                  color: statusColor,
                  backgroundColor: 'var(--bg-surface)',
                }}
              >
                <span>{STATUS_LABELS[liveResult.status][locale]}</span>
                <span dir="ltr">{liveResult.readinessScore}/100</span>
              </span>

              <button
                type="button"
                data-testid="lang-toggle-btn"
                onClick={() => setLocale((prev) => (prev === 'ar' ? 'en' : 'ar'))}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
              >
                <Globe className="h-3.5 w-3.5" />
                {copy.langSwitch}
              </button>

              <button
                type="button"
                data-testid="theme-toggle-btn"
                onClick={() =>
                  setTheme((prev) => (prev === 'alabaster-dld' ? 'slate-night' : 'alabaster-dld'))
                }
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
              >
                {theme === 'alabaster-dld' ? (
                  <Moon className="h-3.5 w-3.5" />
                ) : (
                  <Sun className="h-3.5 w-3.5" />
                )}
                {theme === 'alabaster-dld' ? copy.themeDark : copy.themeLight}
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
              >
                <Printer className="h-3.5 w-3.5" />
                {isAr ? 'PDF' : 'PDF'}
              </button>
            </div>
          </div>

          {/* Preset Bar */}
          <div className="no-print mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--border-subtle)] pt-3">
            <span className="text-xs font-bold text-[var(--text-secondary)]">
              {copy.presetsLabel}
            </span>
            {RENT_PRESETS.map((preset) => {
              const active = selectedPresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  data-testid={`preset-btn-${preset.id}`}
                  onClick={() => handleSelectPreset(preset.id)}
                  className="rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors"
                  style={{
                    borderColor: active ? 'var(--accent-primary)' : 'var(--border-subtle)',
                    backgroundColor: active ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                    color: active ? 'var(--accent-primary-fg)' : 'var(--text-primary)',
                  }}
                >
                  {isAr ? preset.labelAr : preset.labelEn}
                </button>
              );
            })}
          </div>
        </header>

        {/* Explicit Non-Affiliation Legal Banner */}
        <aside
          data-testid="legal-disclaimer-banner"
          className="flex items-start gap-2.5 rounded-2xl border border-[var(--accent-amber)]/35 bg-[var(--accent-amber-soft)] px-4 py-3 text-xs text-[var(--text-primary)]"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-amber)]" />
          <p className="leading-relaxed">
            {isAr ? liveResult.legalDisclaimerAr : liveResult.legalDisclaimerEn}
          </p>
        </aside>

        {/* Navigation Tabs */}
        <nav className="no-print flex flex-wrap gap-2">
          {(
            [
              ['dashboard', copy.tabs.dashboard],
              ['controls', copy.tabs.controls],
              ['csv', copy.tabs.csv],
              ['vault', copy.tabs.vault],
            ] as const
          ).map(([tabKey, label]) => {
            const active = activeTab === tabKey;
            return (
              <button
                key={tabKey}
                type="button"
                data-testid={`tab-${tabKey}`}
                onClick={() => setActiveTab(tabKey)}
                className="rounded-xl border px-4 py-2 text-xs font-extrabold transition-colors"
                style={{
                  borderColor: active ? 'var(--accent-primary)' : 'var(--border-subtle)',
                  backgroundColor: active ? 'var(--accent-primary)' : 'var(--bg-surface)',
                  color: active ? 'var(--accent-primary-fg)' : 'var(--text-primary)',
                }}
              >
                {label}
              </button>
            );
          })}
        </nav>

        {/* Toast Notification */}
        {toast && (
          <div className="no-print rounded-xl border border-[var(--accent-primary)] bg-[var(--bg-surface)] px-4 py-2.5 text-xs font-bold text-[var(--accent-primary)] shadow">
            {toast}
          </div>
        )}

        {/* Active View */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            <RentBracketAndNoticeSvg input={input} result={liveResult} locale={locale} />
            <RentAndEvictionPanel
              input={input}
              result={liveResult}
              locale={locale}
              onChange={handleInputPatch}
            />
          </div>
        )}

        {activeTab === 'controls' && (
          <ControlsAndFindingsPanel
            result={liveResult}
            implementedControls={input.implementedControls}
            locale={locale}
            onToggleControl={handleToggleControl}
            onSelectAllControls={handleSelectAllControls}
          />
        )}

        {activeTab === 'csv' && (
          <UnitCsvAuditPanel
            unitCsv={input.unitCsv || ''}
            locale={locale}
            onChangeCsv={(next) => handleInputPatch({ unitCsv: next })}
            onExportSafeCsv={(filename, content) =>
              triggerFileDownload(filename, content, 'text/csv;charset=utf-8')
            }
          />
        )}

        {activeTab === 'vault' && (
          <DossierVaultAndPrint
            dossiers={dossiers}
            liveResult={liveResult}
            locale={locale}
            busyAction={busyAction}
            onSaveDraft={handleSaveDraft}
            onFinalize={handleFinalize}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onDownloadBrief={handleDownloadBrief}
            onDownloadCsv={handleDownloadCsv}
            onOpenPublic={openPublicReportRoute}
            onCopyPublicUrl={handleCopyPublicUrl}
          />
        )}

        <footer className="pb-4 pt-2 text-center text-[11px] text-[var(--text-secondary)]">
          <div className="rent-mono" dir="ltr">
            ReraRentAE v{RERARENTAE_TOOL_VERSION} · SHA-256: {shaDigest.slice(0, 16) || '…'} · MIT
          </div>
        </footer>
      </main>
    </div>
  );
}
