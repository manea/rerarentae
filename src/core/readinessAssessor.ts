import { canonicalizeDossierPayload, computePayloadDigest } from './dossierDigest.ts';
import { evaluateEvictionAndDispute } from './evictionAndDisputeEngine.ts';
import { evaluateRentAndNotice } from './rentAndNoticeEngine.ts';
import {
  LEGAL_DISCLAIMER_AR,
  LEGAL_DISCLAIMER_EN,
  RENT_CONTROLS,
  RERARENTAE_TOOL_VERSION,
} from './rentCatalog.ts';
import type {
  AssessmentInput,
  AssessmentResult,
  FindingItem,
  ReadinessStatus,
} from './types.ts';
import { auditUnitCsv } from './unitCsvAuditor.ts';

export function evaluateReraRentCoreSync(
  input: AssessmentInput,
): Omit<AssessmentResult, 'canonicalDossierText' | 'dossierSha256'> {
  const rentEval = evaluateRentAndNotice(input);
  const evictionEval = evaluateEvictionAndDispute(input, rentEval);
  const csvAudit = input.unitCsv && input.unitCsv.trim() ? auditUnitCsv(input.unitCsv) : null;

  const implementedSet = new Set(input.implementedControls);
  const controls = RENT_CONTROLS.map((ctrl) => ({
    id: ctrl.id,
    titleEn: ctrl.titleEn,
    titleAr: ctrl.titleAr,
    implemented: implementedSet.has(ctrl.id),
    weight: ctrl.weight,
  }));

  const readinessScore = Math.max(
    0,
    Math.min(
      100,
      controls.reduce((sum, ctrl) => sum + (ctrl.implemented ? ctrl.weight : 0), 0),
    ),
  );

  const findings: FindingItem[] = [];

  if (!input.contractRegisteredInRegistry) {
    findings.push({
      code: 'REGISTRY_UNREGISTERED',
      severity: 'blocker',
      titleEn: 'Tenancy Contract Missing Official Ejari / Tawtheeq / Municipality Registration',
      titleAr: 'غياب توثيق العقد في إيجاري / توثيق / بلدية الشارقة',
      detailEn:
        'Unregistered leases face procedural barriers when filing rent or eviction claims in Dubai RDC, Abu Dhabi courts, or Sharjah Rental Disputes.',
      detailAr:
        'عدم توثيق عقد الإيجار رسمياً يضعف القبول الإجرائي لأي مطالبة أمام لجان ومراكز فض المنازعات الإيجارية.',
      legalRef: 'Dubai Law 26/2007 Art. 4; Abu Dhabi Law 20/2006; Sharjah Law 5/2024',
    });
  }

  if (rentEval.excessAnnualOverchargeAed > 0) {
    findings.push({
      code: 'RENT_EXCEEDS_STATUTORY_CAP',
      severity: 'blocker',
      titleEn: `Proposed Rent Exceeds Statutory Cap by ${rentEval.excessAnnualOverchargeAed.toFixed(0)} AED/yr`,
      titleAr: `الزيادة المقترحة تتجاوز الحد النظامي بمقدار ${rentEval.excessAnnualOverchargeAed.toFixed(0)} درهم سنوياً`,
      detailEn: `Statutory ceiling after notice validity check is ${rentEval.effectiveLegalMaxRentAed.toFixed(0)} AED (${rentEval.effectiveAllowedPct}% allowed vs ${rentEval.proposedIncreasePct}% proposed).`,
      detailAr: `السقف النظامي المسموح به بعد فحص الإخطار هو ${rentEval.effectiveLegalMaxRentAed.toFixed(0)} درهم (${rentEval.effectiveAllowedPct}% مسموح مقارنة بـ ${rentEval.proposedIncreasePct}% مقترح).`,
      legalRef:
        input.emirate === 'dubai_rera'
          ? 'Dubai Decree 43/2013 Art. 1 & Law 33/2008 Art. 14'
          : input.emirate === 'abudhabi_adrec'
            ? 'Abu Dhabi ADREC Cap Directive & Law 20/2006'
            : 'Sharjah Law 5/2024 Art. 10 (3yr/5yr Rent Lock)',
    });
  }

  if (input.proposedAnnualRentAed > input.currentAnnualRentAed && !rentEval.noticeValidForHike) {
    findings.push({
      code: 'LATE_OR_INFORMAL_RENT_NOTICE',
      severity: 'blocker',
      titleEn: `Rent Increase Notice Invalid (${input.rentNoticeDaysBeforeExpiry}d / ${input.noticeDeliveryChannel})`,
      titleAr: `إخطار زيادة الإيجار غير مستوفٍ للمهلة أو الوسيلة الرسمية`,
      detailEn: `Requires at least ${rentEval.requiredNoticeDays} days written notice before ${input.leaseExpiryDate} (cutoff ${rentEval.latestNoticeDeadlineDate}); WhatsApp or late notices void any hike.`,
      detailAr: `يشترط إخطار كتابي قبل الانتهاء بـ ${rentEval.requiredNoticeDays} يوماً على الأقل (الموعد الأقصى ${rentEval.latestNoticeDeadlineDate})؛ والإخطار المتأخر أو عبر واتساب لا يعتد به.`,
      legalRef:
        input.emirate === 'dubai_rera'
          ? 'Dubai Law 33/2008 Art. 14'
          : input.emirate === 'abudhabi_adrec'
            ? 'Abu Dhabi Law 20/2006 Art. 20'
            : 'Sharjah Law 5/2024',
    });
  }

  if (evictionEval.evictionRequested && !evictionEval.evictionNoticeValid) {
    findings.push({
      code: 'EVICTION_INVALID_OR_UNNOTARIZED',
      severity: 'blocker',
      titleEn: 'Eviction Notice Does Not Satisfy Statutory Window, Ground, or Notary Requirement',
      titleAr: 'إخطار الإخلاء مخالف للمهلة أو السبب الحصري أو توثيق الكاتب العدل',
      detailEn:
        input.emirate === 'dubai_rera'
          ? `Dubai post-expiry evictions require an Art. 25(2) ground and ${evictionEval.requiredEvictionDays} days notice strictly via Notary Public or Registered Mail.`
          : `Eviction fails the ${evictionEval.requiredEvictionDays}-day formal notice rule or falls within an active statutory lock period.`,
      detailAr:
        input.emirate === 'dubai_rera'
          ? `الإخلاء بعد انتهاء العقد بدبي يشترط سبباً حصرياً وفق م25(2) وإخطار ${evictionEval.requiredEvictionDays} يوماً بالكاتب العدل أو البريد المسجل.`
          : `إخطار الإخلاء لا يستوفي مهلة ${evictionEval.requiredEvictionDays} يوماً أو يصطدم بفترة قفل قانونية سارية.`,
      legalRef:
        input.emirate === 'dubai_rera'
          ? 'Dubai Law 33/2008 Art. 25(1)-(2)'
          : input.emirate === 'abudhabi_adrec'
            ? 'Abu Dhabi Law 20/2006 & Law 4/2010'
            : 'Sharjah Law 5/2024',
    });
  }

  if (evictionEval.reRentBanViolationActive) {
    findings.push({
      code: 'RE_RENT_BAN_VIOLATION',
      severity: 'blocker',
      titleEn: `Active ${evictionEval.reRentBanYears}-Year Post-Personal-Use Re-Rent Ban Breached`,
      titleAr: `مخالفة حظر إعادة التأجير (${evictionEval.reRentBanYears} سنوات/سنتين) بعد إخلاء الاستخدام الشخصي`,
      detailEn:
        'Re-letting a recovered unit within 2 years (residential) or 3 years (commercial) triggers RDC tenant compensation rights.',
      detailAr:
        'إعادة تأجير العقار للغير قبل مضي سنتين سكنياً أو 3 سنوات تجارياً يرتب حق المستأجر في التعويض أمام مركز فض المنازعات.',
      legalRef: 'Dubai Law 33/2008 Art. 25(3)',
    });
  }

  if (csvAudit && (csvAudit.blockedCount > 0 || csvAudit.parseErrors.length > 0)) {
    findings.push({
      code: 'CSV_PORTFOLIO_BLOCKERS',
      severity: 'blocker',
      titleEn: `${csvAudit.blockedCount} Blocked Unit(s) / ${csvAudit.parseErrors.length} Parse Issue(s) in CSV`,
      titleAr: `وجود ${csvAudit.blockedCount} وحدة مخالفة أو مرفوضة في ملف محفظة CSV`,
      detailEn: `Portfolio audit detected ${csvAudit.totalExcessOverchargeAed.toFixed(0)} AED/yr aggregate excess overcharge and sanitized ${csvAudit.formulaSanitizedCount} formula-injection payload(s).`,
      detailAr: `رصد تدقيق CSV فروقات زيادة إجمالية بقيمة ${csvAudit.totalExcessOverchargeAed.toFixed(0)} درهم سنوياً وتم تعقيم ${csvAudit.formulaSanitizedCount} محاولة حقن صيغ.`,
      legalRef: 'Decree 43/2013 & CWE-1236 Safe Export',
    });
  }

  if (
    input.emirate === 'abudhabi_adrec' &&
    input.evictionReason === 'end_of_term_no_cause' &&
    input.abuDhabiAdrecFreezeActive &&
    evictionEval.evictionNoticeValid
  ) {
    findings.push({
      code: 'ADREC_FREEZE_NON_RENEWAL_SCRUTINY',
      severity: 'warning',
      titleEn: 'Non-Renewal During Active ADREC 0% Index Freeze Carries Dispute Risk',
      titleAr: 'عدم التجديد أثناء سريان تجميد ADREC 0% قد يخضع لمراجعة الجهة المختصة',
      detailEn:
        'Even with timely notice under Abu Dhabi Law 4/2010, landlords should retain proof that non-renewal is not a disguised cap circumvention.',
      detailAr:
        'رغم استيفاء مهلة الإخطار في أبوظبي، يُنصح بتوثيق أسباب عدم التجديد لإثبات عدم الالتفاف على سقف الزيادة.',
      legalRef: 'Abu Dhabi ADREC Guidance & Law 4/2010',
    });
  }

  if (csvAudit && csvAudit.conditionalCount > 0) {
    findings.push({
      code: 'CSV_PORTFOLIO_CONDITIONALS',
      severity: 'warning',
      titleEn: `${csvAudit.conditionalCount} Unit(s) in CSV Require Documentary Follow-Up`,
      titleAr: `${csvAudit.conditionalCount} وحدة في ملف CSV تتطلب استكمال مستندات`,
      detailEn: 'Some CSV units lack Notary/Registered Mail confirmation or index benchmarks.',
      detailAr: 'بعض الوحدات تعتمد إخطار بريد إلكتروني أو تفتقر لرقم مؤشر موثق.',
      legalRef: 'Ejari / Tawtheeq Audit Trail',
    });
  }

  const missingControls = controls.filter((c) => !c.implemented);
  if (missingControls.length > 0) {
    findings.push({
      code: 'MISSING_READINESS_CONTROLS',
      severity: 'warning',
      titleEn: `${missingControls.length} Governance Control(s) Pending Completion`,
      titleAr: `${missingControls.length} ضابط حوكمة إيجارية بانتظار الاستكمال`,
      detailEn: `Pending controls: ${missingControls.map((c) => c.id).join(', ')}.`,
      detailAr: `الضوابط غير المكتملة: ${missingControls.map((c) => c.id).join('، ')}.`,
      legalRef: 'ReraRentAE 6-Control Readiness Framework',
    });
  }

  if (findings.length === 0) {
    findings.push({
      code: 'FULL_STATUTORY_READINESS',
      severity: 'info',
      titleEn: 'Full Rent Cap, Notice SLA & Registry Compliance Verified',
      titleAr: 'امتثال كامل لسقف الزيادة ومهل الإخطار وتوثيق العقد',
      detailEn:
        'No statutory rent overcharge, notice-window defect, or improper eviction ground detected.',
      detailAr:
        'لا توجد تجاوزات على شرائح الزيادة أو مهل الإخطار أو ضوابط الإخلاء النظامية.',
      legalRef: 'Decree 43/2013 & Law 33/2008 / ADREC / Sharjah Law 5/2024',
    });
  }

  const blockerCount = findings.filter((f) => f.severity === 'blocker').length;
  const warningCount = findings.filter((f) => f.severity === 'warning').length;
  const activeGapCount = blockerCount + warningCount;

  let status: ReadinessStatus = 'ready';
  if (blockerCount > 0) {
    status = 'blocked';
  } else if (warningCount > 0 || missingControls.length > 0) {
    status = 'conditional';
  }

  return {
    toolName: 'ReraRentAE',
    version: RERARENTAE_TOOL_VERSION,
    legalDisclaimerEn: LEGAL_DISCLAIMER_EN,
    legalDisclaimerAr: LEGAL_DISCLAIMER_AR,
    partyName: input.partyName,
    unitReference: input.unitReference,
    emirate: input.emirate,
    leaseExpiryDate: input.leaseExpiryDate,
    rentEval,
    evictionEval,
    csvAudit,
    status,
    readinessScore,
    activeGapCount,
    controls,
    findings,
  };
}

export async function assessReraRentReadiness(
  input: AssessmentInput,
): Promise<AssessmentResult> {
  const core = evaluateReraRentCoreSync(input);
  const canonicalDossierText = canonicalizeDossierPayload({
    ...core,
    notes: input.notes ?? '',
  });
  const dossierSha256 = await computePayloadDigest(canonicalDossierText);

  return {
    ...core,
    canonicalDossierText,
    dossierSha256,
  };
}
