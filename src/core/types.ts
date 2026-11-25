export type EmirateJurisdiction =
  | 'dubai_rera'
  | 'abudhabi_adrec'
  | 'sharjah_municipality';

export type PropertyType = 'residential' | 'commercial' | 'industrial';

export type NoticeDeliveryChannel =
  | 'notary_or_registered_mail'
  | 'email_written_formal'
  | 'whatsapp_or_verbal'
  | 'none';

export type EvictionReason =
  | 'none'
  | 'property_sale'
  | 'personal_use_first_degree'
  | 'demolition_or_reconstruction'
  | 'comprehensive_maintenance'
  | 'non_payment_breach'
  | 'end_of_term_no_cause';

export type ReadinessStatus = 'ready' | 'conditional' | 'blocked';
export type SeverityLevel = 'blocker' | 'warning' | 'info';

export type RentControlId =
  | 'RENT-CTRL-01'
  | 'RENT-CTRL-02'
  | 'RENT-CTRL-03'
  | 'RENT-CTRL-04'
  | 'RENT-CTRL-05'
  | 'RENT-CTRL-06';

export interface RentControlSpec {
  id: RentControlId;
  weight: number;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
}

export interface AssessmentInput {
  partyName: string;
  unitReference: string;
  emirate: EmirateJurisdiction;
  propertyType: PropertyType;
  leaseStartDate: string;
  leaseExpiryDate: string;
  yearsIntoInitialTenancy: number;
  yearsSinceLastRentIncrease: number;
  currentAnnualRentAed: number;
  indexBenchmarkRentAed: number;
  proposedAnnualRentAed: number;
  abuDhabiAdrecFreezeActive: boolean;
  noticeDeliveryChannel: NoticeDeliveryChannel;
  rentNoticeDaysBeforeExpiry: number;
  evictionReason: EvictionReason;
  evictionNoticeDaysServed: number;
  contractRegisteredInRegistry: boolean;
  priorPersonalUseEvictionUnder2Yr3YrBan: boolean;
  unitCsv?: string;
  implementedControls: readonly RentControlId[];
  notes?: string;
}

export interface FindingItem {
  code: string;
  severity: SeverityLevel;
  titleEn: string;
  titleAr: string;
  detailEn: string;
  detailAr: string;
  legalRef: string;
}

export interface Decree43BracketResult {
  pctBelowMarket: number;
  maxAllowedPct: number;
  maxAllowedRentAed: number;
  bracketLabel: '0pct' | '5pct' | '10pct' | '15pct' | '20pct';
}

export interface RentAndNoticeEvaluation {
  pctBelowMarket: number;
  bracketAllowedPct: number;
  statutoryCapPctBeforeNotice: number;
  effectiveAllowedPct: number;
  effectiveLegalMaxRentAed: number;
  proposedIncreasePct: number;
  proposedIncreaseAed: number;
  excessAnnualOverchargeAed: number;
  requiredNoticeDays: number;
  noticeValidForHike: boolean;
  latestNoticeDeadlineDate: string;
  sharjahLockYearsRemaining: number;
}

export interface EvictionAndDisputeResult {
  evictionRequested: boolean;
  evictionNoticeValid: boolean;
  requiredEvictionDays: number;
  requiresNotaryOrRegisteredMail: boolean;
  reRentBanYears: number;
  reRentBanViolationActive: boolean;
  estimatedRdcFilingFeeAed: number;
  estimatedRdcAdminFeesAed: number;
  totalEstimatedDisputeCostAed: number;
  annualTenantSavingsIfDisputedAed: number;
}

export interface UnitCsvRowAudit {
  rowNumber: number;
  unitCode: string;
  tenantName: string;
  emirate: EmirateJurisdiction;
  propertyType: PropertyType;
  currentAnnualRentAed: number;
  indexBenchmarkRentAed: number;
  proposedAnnualRentAed: number;
  effectiveLegalMaxRentAed: number;
  excessOverchargeAed: number;
  noticeDaysServed: number;
  registeredInRegistry: boolean;
  status: ReadinessStatus;
  issues: string[];
}

export interface UnitCsvAuditSummary {
  totalRows: number;
  readyCount: number;
  conditionalCount: number;
  blockedCount: number;
  totalCurrentRentAed: number;
  totalProposedRentAed: number;
  totalExcessOverchargeAed: number;
  formulaSanitizedCount: number;
  rows: UnitCsvRowAudit[];
  parseErrors: string[];
}

export interface AssessmentResult {
  toolName: 'ReraRentAE';
  version: string;
  legalDisclaimerEn: string;
  legalDisclaimerAr: string;
  partyName: string;
  unitReference: string;
  emirate: EmirateJurisdiction;
  leaseExpiryDate: string;
  rentEval: RentAndNoticeEvaluation;
  evictionEval: EvictionAndDisputeResult;
  csvAudit: UnitCsvAuditSummary | null;
  status: ReadinessStatus;
  readinessScore: number;
  activeGapCount: number;
  controls: Array<{
    id: RentControlId;
    titleEn: string;
    titleAr: string;
    implemented: boolean;
    weight: number;
  }>;
  findings: FindingItem[];
  canonicalDossierText: string;
  dossierSha256: string;
}

export interface ReraRentPreset {
  id: string;
  labelEn: string;
  labelAr: string;
  descriptionEn: string;
  descriptionAr: string;
  input: AssessmentInput;
}
