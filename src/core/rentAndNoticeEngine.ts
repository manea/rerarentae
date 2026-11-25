import {
  ABUDHABI_ADREC_FREEZE_PCT,
  ABUDHABI_COMMERCIAL_NOTICE_DAYS,
  ABUDHABI_RESIDENTIAL_NOTICE_DAYS,
  ABUDHABI_STATUTORY_CAP_PCT,
  DUBAI_RERA_NOTICE_DAYS,
  SHARJAH_COMMERCIAL_LOCK_YEARS,
  SHARJAH_RESIDENTIAL_LOCK_YEARS,
  SHARJAH_RESIDENTIAL_NOTICE_DAYS,
  SHARJAH_SUBSEQUENT_LOCK_YEARS,
} from './rentCatalog.ts';
import type {
  AssessmentInput,
  Decree43BracketResult,
  RentAndNoticeEvaluation,
} from './types.ts';

export function roundAed(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value * 100) / 100;
}

export function roundPct(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value * 100) / 100;
}

export function nonNegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function computeNoticeDeadlineDate(expiryDateIso: string, requiredDays: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(expiryDateIso.trim());
  if (!match) {
    return expiryDateIso;
  }
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const utcDate = new Date(Date.UTC(year, month, day));
  if (Number.isNaN(utcDate.getTime())) {
    return expiryDateIso;
  }
  utcDate.setUTCDate(utcDate.getUTCDate() - Math.max(0, Math.floor(requiredDays)));
  return utcDate.toISOString().slice(0, 10);
}

/**
 * Classifies Dubai residential/commercial renewal caps strictly under
 * Decree No. (43) of 2013 Art. 1 using RERA Smart Rental Index benchmarks.
 */
export function classifyDecree43Cap(
  currentAnnualRentAed: number,
  indexBenchmarkRentAed: number,
): Decree43BracketResult {
  const current = nonNegative(currentAnnualRentAed);
  const indexRent = nonNegative(indexBenchmarkRentAed);

  if (current === 0 || indexRent === 0 || current >= indexRent) {
    return {
      pctBelowMarket: 0,
      maxAllowedPct: 0,
      maxAllowedRentAed: roundAed(current),
      bracketLabel: '0pct',
    };
  }

  const rawPctBelow = ((indexRent - current) / indexRent) * 100;
  const stabilizedPctBelow = Math.round(rawPctBelow * 1e6) / 1e6;
  const pctBelowMarket = roundPct(rawPctBelow);

  let maxAllowedPct = 0;
  let bracketLabel: Decree43BracketResult['bracketLabel'] = '0pct';

  if (stabilizedPctBelow <= 10) {
    maxAllowedPct = 0;
    bracketLabel = '0pct';
  } else if (stabilizedPctBelow <= 20) {
    maxAllowedPct = 5;
    bracketLabel = '5pct';
  } else if (stabilizedPctBelow <= 30) {
    maxAllowedPct = 10;
    bracketLabel = '10pct';
  } else if (stabilizedPctBelow <= 40) {
    maxAllowedPct = 15;
    bracketLabel = '15pct';
  } else {
    maxAllowedPct = 20;
    bracketLabel = '20pct';
  }

  return {
    pctBelowMarket,
    maxAllowedPct,
    maxAllowedRentAed: roundAed(current * (1 + maxAllowedPct / 100)),
    bracketLabel,
  };
}

export function evaluateRentAndNotice(input: AssessmentInput): RentAndNoticeEvaluation {
  const current = nonNegative(input.currentAnnualRentAed);
  const indexRent = nonNegative(input.indexBenchmarkRentAed);
  const proposed = nonNegative(input.proposedAnnualRentAed);

  const proposedIncreaseAed = roundAed(proposed - current);
  const proposedIncreasePct = current > 0 ? roundPct(((proposed - current) / current) * 100) : 0;

  let pctBelowMarket =
    indexRent > 0 && current < indexRent ? roundPct(((indexRent - current) / indexRent) * 100) : 0;
  let bracketAllowedPct = 0;
  let statutoryCapPctBeforeNotice = 0;
  let requiredNoticeDays = DUBAI_RERA_NOTICE_DAYS;
  let sharjahLockYearsRemaining = 0;

  if (input.emirate === 'dubai_rera') {
    const decree = classifyDecree43Cap(current, indexRent);
    pctBelowMarket = decree.pctBelowMarket;
    bracketAllowedPct = decree.maxAllowedPct;
    statutoryCapPctBeforeNotice = decree.maxAllowedPct;
    requiredNoticeDays = DUBAI_RERA_NOTICE_DAYS;
  } else if (input.emirate === 'abudhabi_adrec') {
    bracketAllowedPct = input.abuDhabiAdrecFreezeActive
      ? ABUDHABI_ADREC_FREEZE_PCT
      : ABUDHABI_STATUTORY_CAP_PCT;
    statutoryCapPctBeforeNotice = bracketAllowedPct;
    requiredNoticeDays =
      input.propertyType === 'residential'
        ? ABUDHABI_RESIDENTIAL_NOTICE_DAYS
        : ABUDHABI_COMMERCIAL_NOTICE_DAYS;
  } else {
    const initialLockYears =
      input.propertyType === 'residential'
        ? SHARJAH_RESIDENTIAL_LOCK_YEARS
        : SHARJAH_COMMERCIAL_LOCK_YEARS;
    const yearsInitial = nonNegative(input.yearsIntoInitialTenancy);
    const yearsSinceHike = nonNegative(input.yearsSinceLastRentIncrease);

    if (yearsInitial < initialLockYears) {
      sharjahLockYearsRemaining = roundPct(initialLockYears - yearsInitial);
    } else if (yearsSinceHike < SHARJAH_SUBSEQUENT_LOCK_YEARS) {
      sharjahLockYearsRemaining = roundPct(SHARJAH_SUBSEQUENT_LOCK_YEARS - yearsSinceHike);
    } else {
      sharjahLockYearsRemaining = 0;
    }

    if (sharjahLockYearsRemaining > 0) {
      bracketAllowedPct = 0;
      statutoryCapPctBeforeNotice = 0;
    } else if (current > 0 && indexRent > current) {
      bracketAllowedPct = roundPct(((indexRent - current) / current) * 100);
      statutoryCapPctBeforeNotice = bracketAllowedPct;
    } else {
      bracketAllowedPct = 0;
      statutoryCapPctBeforeNotice = 0;
    }
    requiredNoticeDays = SHARJAH_RESIDENTIAL_NOTICE_DAYS;
  }

  const isWrittenFormalChannel =
    input.noticeDeliveryChannel === 'notary_or_registered_mail' ||
    input.noticeDeliveryChannel === 'email_written_formal';
  const noticeValidForHike =
    isWrittenFormalChannel && nonNegative(input.rentNoticeDaysBeforeExpiry) >= requiredNoticeDays;

  const effectiveAllowedPct = noticeValidForHike ? statutoryCapPctBeforeNotice : 0;
  const effectiveLegalMaxRentAed = roundAed(current * (1 + effectiveAllowedPct / 100));
  const excessAnnualOverchargeAed = roundAed(Math.max(0, proposed - effectiveLegalMaxRentAed));
  const latestNoticeDeadlineDate = computeNoticeDeadlineDate(
    input.leaseExpiryDate,
    requiredNoticeDays,
  );

  return {
    pctBelowMarket,
    bracketAllowedPct,
    statutoryCapPctBeforeNotice,
    effectiveAllowedPct,
    effectiveLegalMaxRentAed,
    proposedIncreasePct,
    proposedIncreaseAed,
    excessAnnualOverchargeAed,
    requiredNoticeDays,
    noticeValidForHike,
    latestNoticeDeadlineDate,
    sharjahLockYearsRemaining,
  };
}
