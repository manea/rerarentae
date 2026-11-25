import type {
  AssessmentInput,
  AssessmentResult,
  EmirateJurisdiction,
  EvictionReason,
  NoticeDeliveryChannel,
  PropertyType,
} from './types.ts';

function escMdCell(value: unknown): string {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function formatNum(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return '0';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : decimals,
    maximumFractionDigits: decimals,
  });
}

const EMIRATE_LABELS: Record<EmirateJurisdiction, { en: string; ar: string }> = {
  dubai_rera: {
    en: 'Dubai (DLD / RERA Smart Index, Decree 43/2013 & Law 33/2008)',
    ar: 'دبي (مؤشر RERA الذكي، مرسوم 43/2013 وقانون 33/2008)',
  },
  abudhabi_adrec: {
    en: 'Abu Dhabi (ADREC 0% Freeze / Tawtheeq & Law 20/2006)',
    ar: 'أبوظبي (تجميد ADREC 0% / توثيق وقانون 20/2006)',
  },
  sharjah_municipality: {
    en: 'Sharjah (Municipality Law 5/2024 3yr/5yr Rent Lock)',
    ar: 'الشارقة (قانون 5/2024 قفل الإيجار 3 و5 سنوات)',
  },
};

const PROPERTY_LABELS: Record<PropertyType, { en: string; ar: string }> = {
  residential: { en: 'Residential', ar: 'سكني' },
  commercial: { en: 'Commercial', ar: 'تجاري' },
  industrial: { en: 'Industrial', ar: 'صناعي' },
};

const CHANNEL_LABELS: Record<NoticeDeliveryChannel, { en: string; ar: string }> = {
  notary_or_registered_mail: {
    en: 'Notary Public / Registered Mail',
    ar: 'الكاتب العدل أو البريد المسجل',
  },
  email_written_formal: {
    en: 'Formal Written Notice / Email',
    ar: 'إخطار كتابي رسمي / بريد إلكتروني',
  },
  whatsapp_or_verbal: {
    en: 'WhatsApp / SMS / Verbal (Informal)',
    ar: 'واتساب / رسالة نصية / شفهي (غير رسمي)',
  },
  none: {
    en: 'No Notice Served',
    ar: 'لم يُوجّه إخطار',
  },
};

const EVICTION_LABELS: Record<EvictionReason, { en: string; ar: string }> = {
  none: { en: 'No Eviction Requested', ar: 'لا يوجد طلب إخلاء' },
  property_sale: { en: 'Property Sale (Art. 25(2))', ar: 'بيع العقار (م25/2)' },
  personal_use_first_degree: {
    en: 'Personal Use / 1st-Degree Relative (Art. 25(2))',
    ar: 'الاستخدام الشخصي / قريب من الدرجة الأولى (م25/2)',
  },
  demolition_or_reconstruction: {
    en: 'Demolition / Reconstruction (Art. 25(2))',
    ar: 'الهدم أو إعادة البناء (م25/2)',
  },
  comprehensive_maintenance: {
    en: 'Comprehensive Maintenance (Art. 25(2))',
    ar: 'الصيانة الشاملة (م25/2)',
  },
  non_payment_breach: {
    en: 'Rent Non-Payment / Statutory Breach',
    ar: 'التخلف عن السداد / مخالفة العقد',
  },
  end_of_term_no_cause: {
    en: 'End-of-Term Non-Renewal Without Art. 25(2) Ground',
    ar: 'عدم التجديد لانتهاء المدة دون سبب حصري',
  },
};

export function buildReraRentBriefMarkdown(
  input: AssessmentInput,
  result: AssessmentResult,
  dossierCode: string,
  sha256Digest: string,
  locale: 'en' | 'ar' = 'ar',
): string {
  const digest = sha256Digest || result.dossierSha256;
  const em = EMIRATE_LABELS[input.emirate] ?? { en: input.emirate, ar: input.emirate };
  const prop = PROPERTY_LABELS[input.propertyType] ?? {
    en: input.propertyType,
    ar: input.propertyType,
  };
  const ch = CHANNEL_LABELS[input.noticeDeliveryChannel] ?? {
    en: input.noticeDeliveryChannel,
    ar: input.noticeDeliveryChannel,
  };
  const ev = EVICTION_LABELS[input.evictionReason] ?? {
    en: input.evictionReason,
    ar: input.evictionReason,
  };
  const { rentEval, evictionEval } = result;

  if (locale === 'ar') {
    const lines: string[] = [
      `# ملف تدقيق الإيجارات والإخطار والإخلاء الإماراتي — \`${dossierCode}\``,
      '',
      `> **تنويه الاستقلالية وعدم التبعية للجهات الرسمية:** ${result.legalDisclaimerAr}`,
      '',
      '## 1. ملخص الأطراف والعقد وحالة الجاهزية',
      '',
      '| البند | القيمة |',
      '|---|---|',
      `| رمز الملف | \`${escMdCell(dossierCode)}\` |`,
      `| الأداة والإصدار | \`ReraRentAE v${escMdCell(result.version)}\` |`,
      `| الأطراف | ${escMdCell(input.partyName)} |`,
      `| مرجع الوحدة | \`${escMdCell(input.unitReference)}\` |`,
      `| الإمارة ونوع العقار | ${em.ar} — ${prop.ar} |`,
      `| بداية / انتهاء العقد | \`${escMdCell(input.leaseStartDate)}\` / \`${escMdCell(input.leaseExpiryDate)}\` |`,
      `| حالة التوثيق الرسمي | **${input.contractRegisteredInRegistry ? 'موثّق (Ejari/Tawtheeq/البلدية)' : 'غير موثّق'}** |`,
      `| حالة الجاهزية والدرجة | **${result.status.toUpperCase()}** (**${result.readinessScore}/100**) |`,
      `| بصمة التثبيت \`SHA-256\` | \`${escMdCell(digest)}\` |`,
      '',
      '## 2. شرائح الزيادة الإيجارية ومهل الإخطار',
      '',
      `- **الإيجار الحالي / المؤشر المرجعي / المقترح**: **${formatNum(input.currentAnnualRentAed)} د.إ** / **${formatNum(input.indexBenchmarkRentAed)} د.إ** / **${formatNum(input.proposedAnnualRentAed)} د.إ**`,
      `- **الفرق عن المؤشر وشريحة الحد النظامي**: **${formatNum(rentEval.pctBelowMarket)}%** تحت المؤشر — الحد الأقصى النظري للشريحة: **${formatNum(rentEval.bracketAllowedPct)}%**`,
      `- **وسيلة ومدة إخطار الزيادة**: ${ch.ar} قبل الانتهاء بـ **${formatNum(input.rentNoticeDaysBeforeExpiry)} يوماً** (الحد النظامي المطلوب: **${formatNum(rentEval.requiredNoticeDays)} يوماً** قبل \`${escMdCell(rentEval.latestNoticeDeadlineDate)}\`) — صلاحية الإخطار للزيادة: **${rentEval.noticeValidForHike ? 'صالح' : 'باطل'}**`,
      `- **الحد الفعلي المسموح والسقف الأقصى**: **${formatNum(rentEval.effectiveAllowedPct)}%** (**${formatNum(rentEval.effectiveLegalMaxRentAed)} د.إ/سنة**) | التجاوز غير النظامي: **${formatNum(rentEval.excessAnnualOverchargeAed)} د.إ/سنة**`,
      ...(input.emirate === 'sharjah_municipality'
        ? [`- **مدة القفل المتبقية بالشارقة (قانون 5/2024)**: **${formatNum(rentEval.sharjahLockYearsRemaining)} سنة**`]
        : []),
      '',
      '## 3. الإخلاء الموثق ورسوم المنازعة التقديرية',
      '',
      `- **طلب الإخلاء**: ${ev.ar} (إشعار موجّه: **${formatNum(input.evictionNoticeDaysServed)} يوماً** مقابل المطلوب **${formatNum(evictionEval.requiredEvictionDays)} يوماً**) — صلاحية الإخلاء: **${evictionEval.evictionNoticeValid ? 'مستوفٍ' : 'غير مستوفٍ / مرفوض'}**`,
      `- **حظر إعادة التأجير (م25/3)**: **${formatNum(evictionEval.reRentBanYears)} سنوات** | انتهاك حالي نشط: **${evictionEval.reRentBanViolationActive ? 'نعم (مخالفة قائمة)' : 'لا'}**`,
      `- **تقدير رسوم قيد RDC بدبي (3.5% بحد 500–20,000 + 120 د.إ إدارية)**: **${formatNum(evictionEval.estimatedRdcFilingFeeAed)} د.إ** + **${formatNum(evictionEval.estimatedRdcAdminFeesAed)} د.إ** = **${formatNum(evictionEval.totalEstimatedDisputeCostAed)} د.إ**`,
      `- **الوفورات السنوية المحتملة للمستأجر عند الاعتراض**: **${formatNum(evictionEval.annualTenantSavingsIfDisputedAed)} د.إ/سنة**`,
      '',
      '## 4. مصفوفة الضوابط الستة (100 نقطة)',
      '',
      '| الضابط | الحالة | الوزن | البيان |',
      '|---|---|---|---|',
      ...result.controls.map(
        (c) => `| \`${c.id}\` | ${c.implemented ? 'مُنفّذ' : 'ناقص'} | ${c.weight} | ${escMdCell(c.titleAr)} |`,
      ),
    ];

    if (result.csvAudit && result.csvAudit.totalRows > 0) {
      lines.push(
        '',
        '## 5. ملخص تدقيق محفظة الوحدات CSV',
        '',
        `- الصفوف: ${result.csvAudit.totalRows} | جاهز: ${result.csvAudit.readyCount} | مشروط: ${result.csvAudit.conditionalCount} | موقوف: ${result.csvAudit.blockedCount} | صيغ محيدة \`CWE-1236\`: ${result.csvAudit.formulaSanitizedCount}`,
        `- إجمالي الإيجار الحالي: **${formatNum(result.csvAudit.totalCurrentRentAed)} د.إ** | المقترح: **${formatNum(result.csvAudit.totalProposedRentAed)} د.إ** | الزيادات غير النظامية: **${formatNum(result.csvAudit.totalExcessOverchargeAed)} د.إ/سنة**`,
        '',
        '| الصف | الوحدة | المستأجر | الإمارة | الحالي (د.إ) | السقف (د.إ) | المقترح (د.إ) | التجاوز (د.إ) | الحالة |',
        '|---|---|---|---|---|---|---|---|---|',
        ...result.csvAudit.rows.map(
          (row) =>
            `| ${row.rowNumber} | \`${escMdCell(row.unitCode)}\` | ${escMdCell(row.tenantName)} | ${row.emirate} | ${formatNum(row.currentAnnualRentAed)} | ${formatNum(row.effectiveLegalMaxRentAed)} | ${formatNum(row.proposedAnnualRentAed)} | ${formatNum(row.excessOverchargeAed)} | **${row.status.toUpperCase()}** |`,
        ),
      );
    }

    if (result.findings.length > 0) {
      lines.push(
        '',
        '## 6. الملاحظات القانونية والفجوات المرصودة',
        '',
        ...result.findings.map(
          (f) => `- **[${f.severity.toUpperCase()} / ${f.code}]** ${f.titleAr} — ${f.detailAr} (*${f.legalRef}*)`,
        ),
      );
    }

    return lines.join('\n');
  }

  const lines: string[] = [
    `# UAE Rental Cap, Notice SLA & Eviction Readiness Dossier — \`${dossierCode}\``,
    '',
    `> **Independence Notice:** ${result.legalDisclaimerEn}`,
    '',
    '## 1. Tenancy Parties, Jurisdiction & Readiness Overview',
    '',
    '| Field | Value |',
    '|---|---|',
    `| Dossier Code | \`${escMdCell(dossierCode)}\` |`,
    `| Tool Version | \`ReraRentAE v${escMdCell(result.version)}\` |`,
    `| Parties | ${escMdCell(input.partyName)} |`,
    `| Unit Reference | \`${escMdCell(input.unitReference)}\` |`,
    `| Emirate / Property Type | ${em.en} — ${prop.en} |`,
    `| Lease Start / Expiry | \`${escMdCell(input.leaseStartDate)}\` / \`${escMdCell(input.leaseExpiryDate)}\` |`,
    `| Official Registry Status | **${input.contractRegisteredInRegistry ? 'Registered (Ejari/Tawtheeq/Sharjah)' : 'Unregistered'}** |`,
    `| Readiness Status & Score | **${result.status.toUpperCase()}** (**${result.readinessScore}/100**) |`,
    `| SHA-256 Digest | \`${escMdCell(digest)}\` |`,
    '',
    '## 2. Rent Increase Brackets & Pre-Expiry Notice SLA',
    '',
    `- **Current / Index Benchmark / Proposed Rent**: **AED ${formatNum(input.currentAnnualRentAed)}** / **AED ${formatNum(input.indexBenchmarkRentAed)}** / **AED ${formatNum(input.proposedAnnualRentAed)}**`,
    `- **Gap Below Market & Statutory Bracket**: **${formatNum(rentEval.pctBelowMarket)}%** below index — Bracket cap before notice: **${formatNum(rentEval.bracketAllowedPct)}%**`,
    `- **Notice Delivery & Lead Time**: ${ch.en}, **${formatNum(input.rentNoticeDaysBeforeExpiry)} days** before expiry (Required: **${formatNum(rentEval.requiredNoticeDays)} days** on/before \`${escMdCell(rentEval.latestNoticeDeadlineDate)}\`) — Valid for hike: **${rentEval.noticeValidForHike ? 'YES' : 'NO'}**`,
    `- **Effective Legal Cap & Overcharge**: **${formatNum(rentEval.effectiveAllowedPct)}%** (**AED ${formatNum(rentEval.effectiveLegalMaxRentAed)}/yr**) | Excess overcharge: **AED ${formatNum(rentEval.excessAnnualOverchargeAed)}/yr**`,
    ...(input.emirate === 'sharjah_municipality'
      ? [`- **Sharjah Law 5/2024 Remaining Rent Lock**: **${formatNum(rentEval.sharjahLockYearsRemaining)} year(s)**`]
      : []),
    '',
    '## 3. Eviction Compliance & Indicative Dispute Economics',
    '',
    `- **Eviction Request**: ${ev.en} (Served: **${formatNum(input.evictionNoticeDaysServed)}d** vs Required: **${formatNum(evictionEval.requiredEvictionDays)}d**) — Valid: **${evictionEval.evictionNoticeValid ? 'YES' : 'NO'}**`,
    `- **Post-Personal-Use Re-Rent Ban (Art. 25(3))**: **${formatNum(evictionEval.reRentBanYears)} years** | Active violation flag: **${evictionEval.reRentBanViolationActive ? 'YES (ACTIVE BREACH)' : 'No'}**`,
    `- **Estimated Dubai RDC Filing Fee (3.5%, 500-20,000 AED + 120 AED admin)**: **AED ${formatNum(evictionEval.estimatedRdcFilingFeeAed)}** + **AED ${formatNum(evictionEval.estimatedRdcAdminFeesAed)}** = **AED ${formatNum(evictionEval.totalEstimatedDisputeCostAed)}**`,
    `- **Annual Tenant Savings if Disputed**: **AED ${formatNum(evictionEval.annualTenantSavingsIfDisputedAed)}/yr**`,
    '',
    '## 4. Six-Control Governance Matrix (100 Points)',
    '',
    '| Control | Status | Weight | Description |',
    '|---|---|---|---|',
    ...result.controls.map(
      (c) => `| \`${c.id}\` | ${c.implemented ? 'Implemented' : 'Gap'} | ${c.weight} | ${escMdCell(c.titleEn)} |`,
    ),
  ];

  if (result.csvAudit && result.csvAudit.totalRows > 0) {
    lines.push(
      '',
      '## 5. Multi-Unit Lease Portfolio CSV Audit Summary',
      '',
      `- Rows: ${result.csvAudit.totalRows} | Ready: ${result.csvAudit.readyCount} | Conditional: ${result.csvAudit.conditionalCount} | Blocked: ${result.csvAudit.blockedCount} | CWE-1236 Sanitized: ${result.csvAudit.formulaSanitizedCount}`,
      `- Current Portfolio Rent: **AED ${formatNum(result.csvAudit.totalCurrentRentAed)}** | Proposed: **AED ${formatNum(result.csvAudit.totalProposedRentAed)}** | Aggregate Overcharge: **AED ${formatNum(result.csvAudit.totalExcessOverchargeAed)}/yr**`,
      '',
      '| Row | Unit | Tenant | Emirate | Current (AED) | Legal Max (AED) | Proposed (AED) | Overcharge (AED) | Status |',
      '|---|---|---|---|---|---|---|---|---|',
      ...result.csvAudit.rows.map(
        (row) =>
          `| ${row.rowNumber} | \`${escMdCell(row.unitCode)}\` | ${escMdCell(row.tenantName)} | ${row.emirate} | ${formatNum(row.currentAnnualRentAed)} | ${formatNum(row.effectiveLegalMaxRentAed)} | ${formatNum(row.proposedAnnualRentAed)} | ${formatNum(row.excessOverchargeAed)} | **${row.status.toUpperCase()}** |`,
      ),
    );
  }

  if (result.findings.length > 0) {
    lines.push(
      '',
      '## 6. Statutory Findings & Remediation Notes',
      '',
      ...result.findings.map(
        (f) => `- **[${f.severity.toUpperCase()} / ${f.code}]** ${f.titleEn} — ${f.detailEn} (*${f.legalRef}*)`,
      ),
    );
  }

  return lines.join('\n');
}
