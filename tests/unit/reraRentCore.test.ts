import { describe, expect, it } from 'vitest';
import {
  assessReraRentReadiness,
  auditUnitCsv,
  classifyDecree43Cap,
  computeNoticeDeadlineDate,
  evaluateEvictionAndDispute,
  evaluateRentAndNotice,
  exportUnitAuditCsv,
  LEGAL_DISCLAIMER_AR,
  LEGAL_DISCLAIMER_EN,
  RENT_CONTROLS,
  RENT_PRESETS,
} from '../../src/core/index.ts';

describe('ReraRentAE Core v0.1.0', () => {
  it('evaluates all three presets to expected statuses, scores, caps, and overcharges', async () => {
    expect(RENT_PRESETS).toHaveLength(3);

    const readyRes = await assessReraRentReadiness(RENT_PRESETS[0].input);
    expect(readyRes.status).toBe('ready');
    expect(readyRes.readinessScore).toBe(100);
    expect(readyRes.rentEval.effectiveAllowedPct).toBe(0);
    expect(readyRes.rentEval.excessAnnualOverchargeAed).toBe(0);
    expect(readyRes.activeGapCount).toBe(0);

    const condRes = await assessReraRentReadiness(RENT_PRESETS[1].input);
    expect(condRes.status).toBe('conditional');
    expect(condRes.readinessScore).toBe(90);
    expect(condRes.rentEval.effectiveAllowedPct).toBe(10);
    expect(condRes.rentEval.excessAnnualOverchargeAed).toBe(0);
    expect(condRes.activeGapCount).toBe(1);

    const blockedRes = await assessReraRentReadiness(RENT_PRESETS[2].input);
    expect(blockedRes.status).toBe('blocked');
    expect(blockedRes.readinessScore).toBe(0);
    expect(blockedRes.rentEval.bracketAllowedPct).toBe(5);
    expect(blockedRes.rentEval.effectiveAllowedPct).toBe(0);
    expect(blockedRes.rentEval.excessAnnualOverchargeAed).toBe(25_000);
    expect(blockedRes.evictionEval.evictionNoticeValid).toBe(false);
    expect(blockedRes.evictionEval.reRentBanViolationActive).toBe(true);
    expect(blockedRes.csvAudit?.formulaSanitizedCount).toBeGreaterThanOrEqual(2);
    expect(blockedRes.csvAudit?.blockedCount).toBe(2);
  });

  it('implements exact Dubai Decree No. 43 of 2013 brackets including boundary thresholds', () => {
    // <= 10% below market -> 0%
    expect(classifyDecree43Cap(90_000, 100_000)).toMatchObject({
      pctBelowMarket: 10,
      maxAllowedPct: 0,
      bracketLabel: '0pct',
      maxAllowedRentAed: 90_000,
    });
    // > 10% .. <= 20% below market -> 5%
    expect(classifyDecree43Cap(89_000, 100_000)).toMatchObject({
      maxAllowedPct: 5,
      bracketLabel: '5pct',
      maxAllowedRentAed: 93_450,
    });
    expect(classifyDecree43Cap(80_000, 100_000)).toMatchObject({
      pctBelowMarket: 20,
      maxAllowedPct: 5,
      bracketLabel: '5pct',
      maxAllowedRentAed: 84_000,
    });
    // > 20% .. <= 30% below market -> 10%
    expect(classifyDecree43Cap(70_000, 100_000)).toMatchObject({
      pctBelowMarket: 30,
      maxAllowedPct: 10,
      bracketLabel: '10pct',
      maxAllowedRentAed: 77_000,
    });
    // > 30% .. <= 40% below market -> 15%
    expect(classifyDecree43Cap(60_000, 100_000)).toMatchObject({
      pctBelowMarket: 40,
      maxAllowedPct: 15,
      bracketLabel: '15pct',
      maxAllowedRentAed: 69_000,
    });
    // > 40% below market -> 20%
    expect(classifyDecree43Cap(59_000, 100_000)).toMatchObject({
      pctBelowMarket: 41,
      maxAllowedPct: 20,
      bracketLabel: '20pct',
      maxAllowedRentAed: 70_800,
    });
  });

  it('invalidates Dubai hikes when Law 33/2008 Art. 14 90-day written notice is missed', () => {
    const base = {
      ...RENT_PRESETS[1].input,
      rentNoticeDaysBeforeExpiry: 89,
      noticeDeliveryChannel: 'email_written_formal' as const,
    };
    const lateEval = evaluateRentAndNotice(base);
    expect(lateEval.bracketAllowedPct).toBe(10);
    expect(lateEval.noticeValidForHike).toBe(false);
    expect(lateEval.effectiveAllowedPct).toBe(0);
    expect(lateEval.effectiveLegalMaxRentAed).toBe(120_000);
    expect(lateEval.excessAnnualOverchargeAed).toBe(12_000);
    expect(computeNoticeDeadlineDate('2026-06-01', 90)).toBe('2026-03-03');
  });

  it('enforces Abu Dhabi ADREC 0% freeze vs 5% statutory cap and 60d/90d notices', () => {
    const freezeEval = evaluateRentAndNotice({
      ...RENT_PRESETS[0].input,
      emirate: 'abudhabi_adrec',
      propertyType: 'residential',
      abuDhabiAdrecFreezeActive: true,
      currentAnnualRentAed: 100_000,
      indexBenchmarkRentAed: 130_000,
      proposedAnnualRentAed: 105_000,
      rentNoticeDaysBeforeExpiry: 60,
    });
    expect(freezeEval.requiredNoticeDays).toBe(60);
    expect(freezeEval.noticeValidForHike).toBe(true);
    expect(freezeEval.effectiveAllowedPct).toBe(0);
    expect(freezeEval.excessAnnualOverchargeAed).toBe(5_000);

    const legacy5PctEval = evaluateRentAndNotice({
      ...RENT_PRESETS[0].input,
      emirate: 'abudhabi_adrec',
      propertyType: 'commercial',
      abuDhabiAdrecFreezeActive: false,
      currentAnnualRentAed: 100_000,
      indexBenchmarkRentAed: 130_000,
      proposedAnnualRentAed: 105_000,
      rentNoticeDaysBeforeExpiry: 90,
    });
    expect(legacy5PctEval.requiredNoticeDays).toBe(90);
    expect(legacy5PctEval.effectiveAllowedPct).toBe(5);
    expect(legacy5PctEval.excessAnnualOverchargeAed).toBe(0);
  });

  it('enforces Sharjah Law 5/2024 3-year residential / 5-year commercial lock & blocks non-breach eviction', async () => {
    const sharjahLocked = await assessReraRentReadiness({
      ...RENT_PRESETS[0].input,
      emirate: 'sharjah_municipality',
      propertyType: 'residential',
      yearsIntoInitialTenancy: 2,
      yearsSinceLastRentIncrease: 2,
      currentAnnualRentAed: 60_000,
      indexBenchmarkRentAed: 75_000,
      proposedAnnualRentAed: 66_000,
      evictionReason: 'end_of_term_no_cause',
      evictionNoticeDaysServed: 90,
    });
    expect(sharjahLocked.rentEval.sharjahLockYearsRemaining).toBe(1);
    expect(sharjahLocked.rentEval.effectiveAllowedPct).toBe(0);
    expect(sharjahLocked.rentEval.excessAnnualOverchargeAed).toBe(6_000);
    expect(sharjahLocked.evictionEval.evictionNoticeValid).toBe(false);
    expect(sharjahLocked.status).toBe('blocked');

    const sharjahCommercial = evaluateRentAndNotice({
      ...RENT_PRESETS[0].input,
      emirate: 'sharjah_municipality',
      propertyType: 'commercial',
      yearsIntoInitialTenancy: 3,
      yearsSinceLastRentIncrease: 3,
      currentAnnualRentAed: 200_000,
      indexBenchmarkRentAed: 240_000,
      proposedAnnualRentAed: 220_000,
      rentNoticeDaysBeforeExpiry: 90,
    });
    expect(sharjahCommercial.sharjahLockYearsRemaining).toBe(2);
    expect(sharjahCommercial.effectiveAllowedPct).toBe(0);
    expect(sharjahCommercial.excessAnnualOverchargeAed).toBe(20_000);
  });

  it('enforces Dubai Art. 25(2) 12-month notary eviction, Art. 25(3) 2yr/3yr ban & RDC 3.5% fee clamp', () => {
    const validEviction = evaluateEvictionAndDispute(
      {
        ...RENT_PRESETS[0].input,
        currentAnnualRentAed: 100_000,
        evictionReason: 'personal_use_first_degree',
        evictionNoticeDaysServed: 365,
        noticeDeliveryChannel: 'notary_or_registered_mail',
      },
      evaluateRentAndNotice(RENT_PRESETS[0].input),
    );
    expect(validEviction.evictionNoticeValid).toBe(true);
    expect(validEviction.requiredEvictionDays).toBe(365);
    expect(validEviction.requiresNotaryOrRegisteredMail).toBe(true);
    expect(validEviction.reRentBanYears).toBe(2);
    expect(validEviction.estimatedRdcFilingFeeAed).toBe(3_500);
    expect(validEviction.estimatedRdcAdminFeesAed).toBe(120);
    expect(validEviction.totalEstimatedDisputeCostAed).toBe(3_620);

    // Commercial 3-year re-rent ban and RDC 500 AED floor / 20,000 AED cap
    const lowRentFee = evaluateEvictionAndDispute(
      {
        ...RENT_PRESETS[0].input,
        propertyType: 'commercial',
        currentAnnualRentAed: 10_000,
        evictionReason: 'personal_use_first_degree',
        evictionNoticeDaysServed: 365,
      },
      evaluateRentAndNotice({ ...RENT_PRESETS[0].input, currentAnnualRentAed: 10_000 }),
    );
    expect(lowRentFee.reRentBanYears).toBe(3);
    expect(lowRentFee.estimatedRdcFilingFeeAed).toBe(500);

    const highRentFee = evaluateEvictionAndDispute(
      {
        ...RENT_PRESETS[0].input,
        currentAnnualRentAed: 900_000,
      },
      evaluateRentAndNotice({ ...RENT_PRESETS[0].input, currentAnnualRentAed: 900_000 }),
    );
    expect(highRentFee.estimatedRdcFilingFeeAed).toBe(20_000);
  });

  it('neutralizes CWE-1236 formula injection idempotently and exports UTF-8 BOM + CRLF CSV', () => {
    const maliciousCsv = [
      'unit_code,tenant_name,emirate,property_type,current_rent_aed,index_rent_aed,proposed_rent_aed,notice_days_served,notice_channel,registered',
      '"=HYPERLINK(""http://evil.example"",""Unit B"")",+EvilTenant,dubai_rera,residential,100000,115000,105000,95,notary_or_registered_mail,true',
    ].join('\n');

    const audit = auditUnitCsv(maliciousCsv);
    expect(audit.formulaSanitizedCount).toBe(2);
    expect(audit.rows[0].unitCode.startsWith("'=HYPERLINK")).toBe(true);
    expect(audit.rows[0].tenantName).toBe("'+EvilTenant");

    const exported = exportUnitAuditCsv(audit);
    expect(exported.startsWith('\uFEFF')).toBe(true);
    expect(exported.includes('\r\n')).toBe(true);
    expect(exported.includes("''=")).toBe(false);
    expect(exported.includes("''+")).toBe(false);
  });

  it('produces identical SHA-256 regardless of control order and includes non-affiliation disclaimers', async () => {
    const forward = RENT_PRESETS[0].input;
    const reversed = {
      ...forward,
      implementedControls: [...RENT_CONTROLS.map((c) => c.id)].reverse(),
    };

    const resA = await assessReraRentReadiness(forward);
    const resB = await assessReraRentReadiness(reversed);

    expect(resA.dossierSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(resA.dossierSha256).toBe(resB.dossierSha256);
    expect(resA.legalDisclaimerEn).toBe(LEGAL_DISCLAIMER_EN);
    expect(resA.legalDisclaimerAr).toBe(LEGAL_DISCLAIMER_AR);
    expect(resA.legalDisclaimerEn).toContain('NOT affiliated with');
    expect(resA.legalDisclaimerAr).toContain('ليست تابعة أو معتمدة');
  });
});
