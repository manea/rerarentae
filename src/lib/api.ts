import {
  assessReraRentReadiness,
  buildReraRentBriefMarkdown,
  exportUnitAuditCsv,
  formatSafeCsvCell,
} from '../core/index.ts';
import type { AssessmentInput, AssessmentResult } from '../core/types.ts';
import { withBase } from './basePath.ts';
import type { Locale } from './i18n.ts';

export type ApiMode = 'server' | 'local';

export interface ReraRentDossierRecord {
  id: number | string;
  profileId: number | string | null;
  dossierCode: string;
  title: string;
  partyName: string;
  unitReference: string;
  emirate: AssessmentInput['emirate'];
  propertyType: AssessmentInput['propertyType'];
  leaseExpiryDate: string;
  status: AssessmentResult['status'];
  readinessScore: number;
  effectiveAllowedPct: number;
  excessOverchargeAed: number;
  totalDisputeCostAed: number;
  activeGapCount: number;
  canonicalText: string;
  dossierSha256: string;
  publicSlug: string | null;
  lockedAt: string | null;
  createdAt: string;
  updatedAt: string;
  input: AssessmentInput;
  result: AssessmentResult;
}

export interface PublicReraRentReport {
  viewCount: number;
  lastViewedAt: string;
  report: {
    dossierCode: string;
    publicSlug: string;
    partyName: string;
    unitReference: string;
    emirate: AssessmentInput['emirate'];
    propertyType: AssessmentInput['propertyType'];
    leaseExpiryDate: string;
    status: AssessmentResult['status'];
    readinessScore: number;
    lockedAt: string;
    dossierSha256: string;
    legalDisclaimerEn: string;
    legalDisclaimerAr: string;
    rentEval: AssessmentResult['rentEval'];
    evictionEval: AssessmentResult['evictionEval'];
    briefAr: string;
    briefEn: string;
  };
}

const LS_DOSSIERS = 'rerarentae.v1.dossiers';
const LS_SEQ = 'rerarentae.v1.seq';
const LS_VIEWS = 'rerarentae.v1.views';

function readLocalList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeLocalList<T>(key: string, items: T[]): void {
  localStorage.setItem(key, JSON.stringify(items));
}

function allocateLocalDossierCode(leaseExpiryDate: string): string {
  const yearNum = Number(String(leaseExpiryDate).slice(0, 4));
  const year = Number.isInteger(yearNum) && yearNum >= 2024 ? yearNum : new Date().getUTCFullYear();
  let seqMap: Record<string, number> = {};
  try {
    const raw = localStorage.getItem(LS_SEQ);
    seqMap = raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    seqMap = {};
  }
  const next = Number(seqMap[String(year)] ?? 0) + 1;
  seqMap[String(year)] = next;
  localStorage.setItem(LS_SEQ, JSON.stringify(seqMap));
  return `RNT-${year}-${String(next).padStart(4, '0')}`;
}

function makeLocalSlug(dossierCode: string): string {
  return `rnt-${dossierCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const payload = (await res.json().catch(() => ({}))) as { message?: string };
  if (!res.ok) {
    throw new Error(payload.message || `HTTP ${res.status}`);
  }
  return payload as T;
}

export async function detectServerMode(): Promise<ApiMode> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1600);
    const res = await fetch(withBase('/health'), {
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return 'local';
    const data = (await res.json()) as { ok?: boolean; service?: string };
    return data.ok && data.service === 'rerarentae' ? 'server' : 'local';
  } catch {
    return 'local';
  }
}

export async function listDossiers(mode: ApiMode): Promise<ReraRentDossierRecord[]> {
  if (mode === 'server') {
    const data = await fetchJson<{ items?: ReraRentDossierRecord[] }>(
      withBase('/api/dossiers?limit=50'),
    );
    return Array.isArray(data.items) ? data.items : [];
  }
  return readLocalList<ReraRentDossierRecord>(LS_DOSSIERS).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export async function saveDossier(
  mode: ApiMode,
  input: AssessmentInput,
  title?: string,
): Promise<ReraRentDossierRecord> {
  if (mode === 'server') {
    const data = await fetchJson<{ item: ReraRentDossierRecord }>(withBase('/api/dossiers'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title?.trim() || `${input.partyName} — ${input.unitReference}`,
        input,
      }),
    });
    return data.item;
  }

  const result = await assessReraRentReadiness(input);
  const now = new Date().toISOString();
  const dossierCode = allocateLocalDossierCode(input.leaseExpiryDate);
  const record: ReraRentDossierRecord = {
    id: dossierCode,
    profileId: null,
    dossierCode,
    title: title?.trim() || `${input.partyName} — ${input.unitReference}`,
    partyName: input.partyName,
    unitReference: input.unitReference,
    emirate: input.emirate,
    propertyType: input.propertyType,
    leaseExpiryDate: input.leaseExpiryDate,
    status: result.status,
    readinessScore: result.readinessScore,
    effectiveAllowedPct: result.rentEval.effectiveAllowedPct,
    excessOverchargeAed: result.rentEval.excessAnnualOverchargeAed,
    totalDisputeCostAed: result.evictionEval.totalEstimatedDisputeCostAed,
    activeGapCount: result.activeGapCount,
    canonicalText: result.canonicalDossierText,
    dossierSha256: result.dossierSha256,
    publicSlug: null,
    lockedAt: null,
    createdAt: now,
    updatedAt: now,
    input: structuredClone(input),
    result,
  };
  const existing = readLocalList<ReraRentDossierRecord>(LS_DOSSIERS);
  writeLocalList(LS_DOSSIERS, [record, ...existing]);
  return record;
}

export async function finalizeDossier(
  mode: ApiMode,
  record: ReraRentDossierRecord,
): Promise<ReraRentDossierRecord> {
  if (mode === 'server') {
    const data = await fetchJson<{ item: ReraRentDossierRecord }>(
      withBase(`/api/dossiers/${encodeURIComponent(record.dossierCode)}/finalize`),
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' },
    );
    return data.item;
  }

  const items = readLocalList<ReraRentDossierRecord>(LS_DOSSIERS);
  const target = items.find((i) => i.dossierCode === record.dossierCode);
  if (!target) throw new Error('Dossier not found in local storage.');
  if (target.lockedAt) throw new Error('Dossier is already finalized and sealed.');

  const result = await assessReraRentReadiness(target.input);
  const now = new Date().toISOString();
  const sealed: ReraRentDossierRecord = {
    ...target,
    status: result.status,
    readinessScore: result.readinessScore,
    effectiveAllowedPct: result.rentEval.effectiveAllowedPct,
    excessOverchargeAed: result.rentEval.excessAnnualOverchargeAed,
    totalDisputeCostAed: result.evictionEval.totalEstimatedDisputeCostAed,
    activeGapCount: result.activeGapCount,
    canonicalText: result.canonicalDossierText,
    dossierSha256: result.dossierSha256,
    publicSlug: target.publicSlug || makeLocalSlug(target.dossierCode),
    lockedAt: now,
    updatedAt: now,
    result,
  };
  writeLocalList(
    LS_DOSSIERS,
    items.map((i) => (i.dossierCode === target.dossierCode ? sealed : i)),
  );
  return sealed;
}

export async function duplicateDossier(
  mode: ApiMode,
  record: ReraRentDossierRecord,
): Promise<ReraRentDossierRecord> {
  if (mode === 'server') {
    const data = await fetchJson<{ item: ReraRentDossierRecord }>(
      withBase(`/api/dossiers/${encodeURIComponent(record.dossierCode)}/duplicate`),
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' },
    );
    return data.item;
  }
  return saveDossier(mode, record.input, `${record.title} (Copy)`);
}

export async function deleteDossier(
  mode: ApiMode,
  record: ReraRentDossierRecord,
): Promise<void> {
  if (mode === 'server') {
    await fetchJson<{ ok: boolean }>(
      withBase(`/api/dossiers/${encodeURIComponent(record.dossierCode)}`),
      { method: 'DELETE' },
    );
    return;
  }
  const items = readLocalList<ReraRentDossierRecord>(LS_DOSSIERS);
  const target = items.find((i) => i.dossierCode === record.dossierCode);
  if (target?.lockedAt) {
    throw new Error('Sealed dossier cannot be deleted.');
  }
  writeLocalList(
    LS_DOSSIERS,
    items.filter((i) => i.dossierCode !== record.dossierCode),
  );
}

export async function fetchBriefMarkdown(
  mode: ApiMode,
  record: ReraRentDossierRecord,
  locale: Locale,
): Promise<string> {
  if (mode === 'server') {
    const res = await fetch(
      withBase(`/api/dossiers/${encodeURIComponent(record.dossierCode)}/brief.md?lang=${locale}`),
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  }
  return buildReraRentBriefMarkdown(
    record.input,
    record.result,
    record.dossierCode,
    record.dossierSha256,
    locale,
  );
}

export function buildLocalSummaryCsv(record: ReraRentDossierRecord): string {
  const header = [
    'dossier_code',
    'party_name',
    'unit_reference',
    'emirate',
    'property_type',
    'lease_expiry_date',
    'current_annual_rent_aed',
    'index_benchmark_rent_aed',
    'proposed_annual_rent_aed',
    'effective_allowed_pct',
    'effective_legal_max_rent_aed',
    'excess_overcharge_aed',
    'required_notice_days',
    'latest_notice_deadline_date',
    'eviction_notice_valid',
    'total_dispute_cost_aed',
    'status',
    'readiness_score',
    'dossier_sha256',
  ].join(',');
  const row = [
    formatSafeCsvCell(record.dossierCode),
    formatSafeCsvCell(record.partyName),
    formatSafeCsvCell(record.unitReference),
    formatSafeCsvCell(record.emirate),
    formatSafeCsvCell(record.propertyType),
    formatSafeCsvCell(record.leaseExpiryDate),
    record.input.currentAnnualRentAed,
    record.input.indexBenchmarkRentAed,
    record.input.proposedAnnualRentAed,
    record.effectiveAllowedPct,
    record.result.rentEval.effectiveLegalMaxRentAed,
    record.excessOverchargeAed,
    record.result.rentEval.requiredNoticeDays,
    formatSafeCsvCell(record.result.rentEval.latestNoticeDeadlineDate),
    record.result.evictionEval.evictionNoticeValid,
    record.totalDisputeCostAed,
    formatSafeCsvCell(record.status),
    record.readinessScore,
    formatSafeCsvCell(record.dossierSha256),
  ].join(',');
  return `\uFEFF${header}\r\n${row}\r\n`;
}

export async function fetchExportCsv(
  mode: ApiMode,
  record: ReraRentDossierRecord,
): Promise<string> {
  if (mode === 'server') {
    const res = await fetch(
      withBase(`/api/dossiers/${encodeURIComponent(record.dossierCode)}/export.csv`),
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const bytes = await res.arrayBuffer();
    const decoded = new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes);
    return decoded.startsWith('\uFEFF') ? decoded : `\uFEFF${decoded}`;
  }
  if (record.result.csvAudit && record.result.csvAudit.rows.length > 0) {
    return exportUnitAuditCsv(record.result.csvAudit);
  }
  return buildLocalSummaryCsv(record);
}

export async function fetchPublicReport(
  mode: ApiMode,
  slugOrCode: string,
): Promise<PublicReraRentReport> {
  if (mode === 'server') {
    return fetchJson<PublicReraRentReport>(
      withBase(`/api/public/reports/${encodeURIComponent(slugOrCode)}`),
    );
  }

  const items = readLocalList<ReraRentDossierRecord>(LS_DOSSIERS);
  const found = items.find(
    (item) =>
      item.lockedAt && (item.publicSlug === slugOrCode || item.dossierCode === slugOrCode),
  );
  if (!found || !found.lockedAt) {
    throw new Error('Published sealed ReraRentAE report was not found.');
  }

  let viewMap: Record<string, { viewCount: number; lastViewedAt: string }> = {};
  try {
    const raw = localStorage.getItem(LS_VIEWS);
    viewMap = raw ? (JSON.parse(raw) as typeof viewMap) : {};
  } catch {
    viewMap = {};
  }
  const now = new Date().toISOString();
  const prevCount = Number(viewMap[found.dossierCode]?.viewCount ?? 0);
  const viewCount = prevCount + 1;
  viewMap[found.dossierCode] = { viewCount, lastViewedAt: now };
  localStorage.setItem(LS_VIEWS, JSON.stringify(viewMap));

  return {
    viewCount,
    lastViewedAt: now,
    report: {
      dossierCode: found.dossierCode,
      publicSlug: found.publicSlug || makeLocalSlug(found.dossierCode),
      partyName: found.partyName,
      unitReference: found.unitReference,
      emirate: found.emirate,
      propertyType: found.propertyType,
      leaseExpiryDate: found.leaseExpiryDate,
      status: found.status,
      readinessScore: found.readinessScore,
      lockedAt: found.lockedAt,
      dossierSha256: found.dossierSha256,
      legalDisclaimerEn: found.result.legalDisclaimerEn,
      legalDisclaimerAr: found.result.legalDisclaimerAr,
      rentEval: found.result.rentEval,
      evictionEval: found.result.evictionEval,
      briefAr: buildReraRentBriefMarkdown(
        found.input,
        found.result,
        found.dossierCode,
        found.dossierSha256,
        'ar',
      ),
      briefEn: buildReraRentBriefMarkdown(
        found.input,
        found.result,
        found.dossierCode,
        found.dossierSha256,
        'en',
      ),
    },
  };
}
