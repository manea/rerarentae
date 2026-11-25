import {
  ABUDHABI_COMMERCIAL_NOTICE_DAYS,
  ABUDHABI_RESIDENTIAL_NOTICE_DAYS,
  DUBAI_EVICTION_NOTICE_DAYS,
  DUBAI_RDC_ADMIN_ADDON_AED,
  DUBAI_RDC_FILING_FEE_PCT,
  DUBAI_RDC_MAX_LEASE_FEE_AED,
  DUBAI_RDC_MIN_FEE_AED,
  DUBAI_RE_RENT_BAN_COMMERCIAL_YEARS,
  DUBAI_RE_RENT_BAN_RESIDENTIAL_YEARS,
  SHARJAH_EVICTION_NOTICE_DAYS,
} from './rentCatalog.ts';
import { nonNegative, roundAed } from './rentAndNoticeEngine.ts';
import type {
  AssessmentInput,
  EvictionAndDisputeResult,
  RentAndNoticeEvaluation,
} from './types.ts';

export function evaluateEvictionAndDispute(
  input: AssessmentInput,
  rentEval: RentAndNoticeEvaluation,
): EvictionAndDisputeResult {
  const evictionRequested = input.evictionReason !== 'none';
  const currentRent = nonNegative(input.currentAnnualRentAed);

  let requiredEvictionDays = 0;
  let requiresNotaryOrRegisteredMail = false;
  let evictionNoticeValid = true;

  if (evictionRequested) {
    if (input.emirate === 'dubai_rera') {
      requiresNotaryOrRegisteredMail = true;
      if (input.evictionReason === 'non_payment_breach') {
        requiredEvictionDays = 30;
        evictionNoticeValid =
          input.noticeDeliveryChannel === 'notary_or_registered_mail' &&
          nonNegative(input.evictionNoticeDaysServed) >= requiredEvictionDays;
      } else if (input.evictionReason === 'end_of_term_no_cause') {
        requiredEvictionDays = DUBAI_EVICTION_NOTICE_DAYS;
        evictionNoticeValid = false;
      } else {
        requiredEvictionDays = DUBAI_EVICTION_NOTICE_DAYS;
        evictionNoticeValid =
          input.noticeDeliveryChannel === 'notary_or_registered_mail' &&
          nonNegative(input.evictionNoticeDaysServed) >= requiredEvictionDays;
      }
    } else if (input.emirate === 'abudhabi_adrec') {
      requiredEvictionDays =
        input.evictionReason === 'non_payment_breach'
          ? 30
          : input.propertyType === 'residential'
            ? ABUDHABI_RESIDENTIAL_NOTICE_DAYS
            : ABUDHABI_COMMERCIAL_NOTICE_DAYS;
      const writtenChannel =
        input.noticeDeliveryChannel === 'notary_or_registered_mail' ||
        input.noticeDeliveryChannel === 'email_written_formal';
      evictionNoticeValid =
        writtenChannel && nonNegative(input.evictionNoticeDaysServed) >= requiredEvictionDays;
    } else {
      requiredEvictionDays =
        input.evictionReason === 'non_payment_breach' ? 15 : SHARJAH_EVICTION_NOTICE_DAYS;
      const writtenChannel =
        input.noticeDeliveryChannel === 'notary_or_registered_mail' ||
        input.noticeDeliveryChannel === 'email_written_formal';
      const blockedByLock =
        rentEval.sharjahLockYearsRemaining > 0 && input.evictionReason !== 'non_payment_breach';
      evictionNoticeValid =
        !blockedByLock &&
        writtenChannel &&
        nonNegative(input.evictionNoticeDaysServed) >= requiredEvictionDays;
    }
  }

  const reRentBanYears =
    input.emirate === 'dubai_rera' &&
    (input.evictionReason === 'personal_use_first_degree' ||
      input.priorPersonalUseEvictionUnder2Yr3YrBan)
      ? input.propertyType === 'residential'
        ? DUBAI_RE_RENT_BAN_RESIDENTIAL_YEARS
        : DUBAI_RE_RENT_BAN_COMMERCIAL_YEARS
      : 0;

  const reRentBanViolationActive = Boolean(input.priorPersonalUseEvictionUnder2Yr3YrBan);

  let estimatedRdcFilingFeeAed = 0;
  let estimatedRdcAdminFeesAed = 0;
  if (input.emirate === 'dubai_rera' && currentRent > 0) {
    const rawRdcFee = currentRent * (DUBAI_RDC_FILING_FEE_PCT / 100);
    estimatedRdcFilingFeeAed = roundAed(
      Math.min(DUBAI_RDC_MAX_LEASE_FEE_AED, Math.max(DUBAI_RDC_MIN_FEE_AED, rawRdcFee)),
    );
    estimatedRdcAdminFeesAed = DUBAI_RDC_ADMIN_ADDON_AED;
  }

  const totalEstimatedDisputeCostAed = roundAed(
    estimatedRdcFilingFeeAed + estimatedRdcAdminFeesAed,
  );
  const annualTenantSavingsIfDisputedAed = roundAed(rentEval.excessAnnualOverchargeAed);

  return {
    evictionRequested,
    evictionNoticeValid,
    requiredEvictionDays,
    requiresNotaryOrRegisteredMail,
    reRentBanYears,
    reRentBanViolationActive,
    estimatedRdcFilingFeeAed,
    estimatedRdcAdminFeesAed,
    totalEstimatedDisputeCostAed,
    annualTenantSavingsIfDisputedAed,
  };
}
