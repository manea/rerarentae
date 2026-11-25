import { evaluateRentAndNotice, roundAed } from './rentAndNoticeEngine.ts';
import type {
  EmirateJurisdiction,
  NoticeDeliveryChannel,
  PropertyType,
  ReadinessStatus,
  UnitCsvAuditSummary,
  UnitCsvRowAudit,
} from './types.ts';

const FORMULA_TRIGGER_RE = /^[\t\r ]*[=+\-@]|^[\t\r]/;

export function needsCsvFormulaSanitization(rawValue: string): boolean {
  return FORMULA_TRIGGER_RE.test(rawValue);
}

export function sanitizeCsvTextField(rawValue: string): {
  clean: string;
  formulaSanitized: boolean;
} {
  const normalized = rawValue.replace(/\uFEFF/g, '').trim();
  if (needsCsvFormulaSanitization(normalized)) {
    return {
      clean: `'${normalized}`,
      formulaSanitized: true,
    };
  }
  return {
    clean: normalized,
    formulaSanitized: false,
  };
}

export function formatSafeCsvCell(value: string | number | boolean): string {
  const raw = String(value);
  const { clean } = sanitizeCsvTextField(raw);
  if (/[",\r\n]/.test(clean)) {
    return `"${clean.replace(/"/g, '""')}"`;
  }
  return clean;
}

function parseCsvRecords(csvText: string): string[][] {
  const cleanText = csvText.replace(/^\uFEFF/, '');
  const records: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const ch = cleanText[i];
    if (inQuotes) {
      if (ch === '"') {
        if (cleanText[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && cleanText[i + 1] === '\n') {
        i++;
      }
      row.push(cell);
      if (row.some((item) => item.trim() !== '')) {
        records.push(row);
      }
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some((item) => item.trim() !== '')) {
      records.push(row);
    }
  }

  return records;
}

function parseEmirate(raw: string): EmirateJurisdiction {
  const norm = raw.trim().toLowerCase();
  if (norm === 'abudhabi_adrec' || norm.includes('abudhabi') || norm.includes('abu_dhabi') || norm.includes('adrec') || norm.includes('tawtheeq')) {
    return 'abudhabi_adrec';
  }
  if (norm === 'sharjah_municipality' || norm.includes('sharjah')) {
    return 'sharjah_municipality';
  }
  return 'dubai_rera';
}

function parsePropertyType(raw: string): PropertyType {
  const norm = raw.trim().toLowerCase();
  if (norm === 'commercial') return 'commercial';
  if (norm === 'industrial') return 'industrial';
  return 'residential';
}

function parseChannel(raw: string): NoticeDeliveryChannel {
  const norm = raw.trim().toLowerCase();
  if (norm === 'notary_or_registered_mail' || norm.includes('notary') || norm.includes('registered')) {
    return 'notary_or_registered_mail';
  }
  if (norm === 'email_written_formal' || norm.includes('email') || norm.includes('written')) {
    return 'email_written_formal';
  }
  if (norm === 'whatsapp_or_verbal' || norm.includes('whatsapp') || norm.includes('verbal')) {
    return 'whatsapp_or_verbal';
  }
  return 'none';
}

function parseBoolean(raw: string): boolean {
  const norm = raw.trim().toLowerCase();
  return norm === 'true' || norm === '1' || norm === 'yes' || norm === 'y';
}

function parseNumber(raw: string): { value: number; valid: boolean } {
  const stripped = raw.replace(/,/g, '').trim();
  if (!stripped) return { value: 0, valid: false };
  const n = Number(stripped);
  if (!Number.isFinite(n) || n < 0) return { value: 0, valid: false };
  return { value: n, valid: true };
}

export function auditUnitCsv(csvText: string): UnitCsvAuditSummary {
  const records = parseCsvRecords(csvText);
  if (records.length < 2) {
    return {
      totalRows: 0,
      readyCount: 0,
      conditionalCount: 0,
      blockedCount: 0,
      totalCurrentRentAed: 0,
      totalProposedRentAed: 0,
      totalExcessOverchargeAed: 0,
      formulaSanitizedCount: 0,
      rows: [],
      parseErrors: ['CSV must include a header row and at least one unit row.'],
    };
  }

  const headers = records[0].map((h) => h.trim().toLowerCase());
  const findCol = (aliases: string[]): number =>
    headers.findIndex((h) => aliases.includes(h));

  const idxUnit = findCol(['unit_code', 'unit', 'unit_ref', 'unit_reference']);
  const idxTenant = findCol(['tenant_name', 'tenant', 'party_name']);
  const idxEmirate = findCol(['emirate', 'jurisdiction']);
  const idxProp = findCol(['property_type', 'type']);
  const idxCurrent = findCol(['current_rent_aed', 'current_annual_rent_aed', 'current_rent']);
  const idxIndex = findCol(['index_rent_aed', 'index_benchmark_rent_aed', 'index_rent']);
  const idxProposed = findCol(['proposed_rent_aed', 'proposed_annual_rent_aed', 'proposed_rent']);
  const idxNoticeDays = findCol(['notice_days_served', 'rent_notice_days', 'notice_days']);
  const idxChannel = findCol(['notice_channel', 'delivery_channel']);
  const idxReg = findCol(['registered', 'registered_in_registry', 'ejari']);

  const parseErrors: string[] = [];
  if (idxUnit === -1 || idxCurrent === -1 || idxProposed === -1) {
    parseErrors.push(
      'Missing required CSV column(s): expected unit_code, current_rent_aed, and proposed_rent_aed.',
    );
  }

  const rows: UnitCsvRowAudit[] = [];
  let readyCount = 0;
  let conditionalCount = 0;
  let blockedCount = 0;
  let totalCurrentRentAed = 0;
  let totalProposedRentAed = 0;
  let totalExcessOverchargeAed = 0;
  let formulaSanitizedCount = 0;

  for (let i = 1; i < records.length; i++) {
    const rawRow = records[i];
    const rowNumber = i + 1;

    for (const rawCell of rawRow) {
      if (needsCsvFormulaSanitization(rawCell.trim())) {
        formulaSanitizedCount++;
      }
    }

    const unitRes = sanitizeCsvTextField(idxUnit >= 0 ? (rawRow[idxUnit] ?? '') : `UNIT-${i}`);
    const tenantRes = sanitizeCsvTextField(idxTenant >= 0 ? (rawRow[idxTenant] ?? '') : 'Tenant');

    const emirate = parseEmirate(idxEmirate >= 0 ? (rawRow[idxEmirate] ?? '') : 'dubai_rera');
    const propertyType = parsePropertyType(idxProp >= 0 ? (rawRow[idxProp] ?? '') : 'residential');
    const currentParsed = parseNumber(idxCurrent >= 0 ? (rawRow[idxCurrent] ?? '') : '');
    const indexParsed = parseNumber(idxIndex >= 0 ? (rawRow[idxIndex] ?? '') : '');
    const proposedParsed = parseNumber(idxProposed >= 0 ? (rawRow[idxProposed] ?? '') : '');
    const noticeDaysParsed = parseNumber(idxNoticeDays >= 0 ? (rawRow[idxNoticeDays] ?? '90') : '90');
    const channel = parseChannel(
      idxChannel >= 0 ? (rawRow[idxChannel] ?? 'email_written_formal') : 'email_written_formal',
    );
    const registeredInRegistry = idxReg >= 0 ? parseBoolean(rawRow[idxReg] ?? 'true') : true;

    const issues: string[] = [];
    if (!currentParsed.valid || !proposedParsed.valid) {
      issues.push('Invalid numeric rent amount');
      parseErrors.push(`Row ${rowNumber}: invalid numeric current or proposed rent.`);
    }

    const rowRentEval = evaluateRentAndNotice({
      partyName: tenantRes.clean,
      unitReference: unitRes.clean,
      emirate,
      propertyType,
      leaseStartDate: '2024-01-01',
      leaseExpiryDate: '2026-01-01',
      yearsIntoInitialTenancy: 3,
      yearsSinceLastRentIncrease: 2,
      currentAnnualRentAed: currentParsed.value,
      indexBenchmarkRentAed: indexParsed.valid ? indexParsed.value : currentParsed.value,
      proposedAnnualRentAed: proposedParsed.value,
      abuDhabiAdrecFreezeActive: emirate === 'abudhabi_adrec',
      noticeDeliveryChannel: channel,
      rentNoticeDaysBeforeExpiry: noticeDaysParsed.value,
      evictionReason: 'none',
      evictionNoticeDaysServed: 0,
      contractRegisteredInRegistry: registeredInRegistry,
      priorPersonalUseEvictionUnder2Yr3YrBan: false,
      implementedControls: [],
    });

    if (!registeredInRegistry) {
      issues.push('Missing Ejari/Tawtheeq/Municipality registration');
    }
    if (rowRentEval.excessAnnualOverchargeAed > 0) {
      issues.push(`Overcharge +${rowRentEval.excessAnnualOverchargeAed} AED/yr`);
    }
    if (proposedParsed.value > currentParsed.value && !rowRentEval.noticeValidForHike) {
      issues.push(`Invalid notice (${noticeDaysParsed.value}d/${channel})`);
    }
    if (!indexParsed.valid) {
      issues.push('Missing index benchmark rent');
    }

    let status: ReadinessStatus = 'ready';
    if (
      !registeredInRegistry ||
      rowRentEval.excessAnnualOverchargeAed > 0 ||
      (proposedParsed.value > currentParsed.value && !rowRentEval.noticeValidForHike) ||
      !currentParsed.valid ||
      !proposedParsed.valid
    ) {
      status = 'blocked';
      blockedCount++;
    } else if (!indexParsed.valid || channel === 'email_written_formal') {
      status = 'conditional';
      conditionalCount++;
    } else {
      readyCount++;
    }

    totalCurrentRentAed = roundAed(totalCurrentRentAed + currentParsed.value);
    totalProposedRentAed = roundAed(totalProposedRentAed + proposedParsed.value);
    totalExcessOverchargeAed = roundAed(
      totalExcessOverchargeAed + rowRentEval.excessAnnualOverchargeAed,
    );

    rows.push({
      rowNumber,
      unitCode: unitRes.clean,
      tenantName: tenantRes.clean,
      emirate,
      propertyType,
      currentAnnualRentAed: roundAed(currentParsed.value),
      indexBenchmarkRentAed: roundAed(indexParsed.valid ? indexParsed.value : currentParsed.value),
      proposedAnnualRentAed: roundAed(proposedParsed.value),
      effectiveLegalMaxRentAed: rowRentEval.effectiveLegalMaxRentAed,
      excessOverchargeAed: rowRentEval.excessAnnualOverchargeAed,
      noticeDaysServed: noticeDaysParsed.value,
      registeredInRegistry,
      status,
      issues,
    });
  }

  return {
    totalRows: rows.length,
    readyCount,
    conditionalCount,
    blockedCount,
    totalCurrentRentAed,
    totalProposedRentAed,
    totalExcessOverchargeAed,
    formulaSanitizedCount,
    rows,
    parseErrors,
  };
}

export function exportUnitAuditCsv(summary: UnitCsvAuditSummary): string {
  const headers = [
    'row_number',
    'unit_code',
    'tenant_name',
    'emirate',
    'property_type',
    'current_annual_rent_aed',
    'index_benchmark_rent_aed',
    'proposed_annual_rent_aed',
    'effective_legal_max_rent_aed',
    'excess_overcharge_aed',
    'notice_days_served',
    'registered_in_registry',
    'status',
    'issues',
  ];

  const lines = [headers.join(',')];
  for (const row of summary.rows) {
    lines.push(
      [
        row.rowNumber,
        formatSafeCsvCell(row.unitCode),
        formatSafeCsvCell(row.tenantName),
        row.emirate,
        row.propertyType,
        row.currentAnnualRentAed,
        row.indexBenchmarkRentAed,
        row.proposedAnnualRentAed,
        row.effectiveLegalMaxRentAed,
        row.excessOverchargeAed,
        row.noticeDaysServed,
        row.registeredInRegistry,
        row.status,
        formatSafeCsvCell(row.issues.join(' | ')),
      ].join(','),
    );
  }

  return `\uFEFF${lines.join('\r\n')}\r\n`;
}
