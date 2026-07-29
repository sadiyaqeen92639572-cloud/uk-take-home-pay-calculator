// Generates satellite folders for mynetsalary.co.uk + sitemap.xml
// Core Income Tax / NI / student-loan logic mirrors the <script> in index.html — keep both in sync if rates change.
const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://mynetsalary.co.uk';
const GSC_TAG = 'F0g9xdQ9RU5cTssBiWtkj41-7q2_kIwcKbJc_sMTthQ';

const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --brand: #1e5fae; --brand-dark: #123e73; --brand-light: #e7f0fb;
    --accent: #b91c1c; --success: #16a34a; --success-light: #dcfce7;
    --text: #1a1a2e; --muted: #64748b; --border: #e2e8f0; --radius: 12px;
  }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: var(--text); background: #f8fafc; line-height: 1.6; }
  header { background: linear-gradient(135deg, var(--brand) 0%, var(--brand-dark) 100%); color: white; padding: 48px 20px 80px; text-align: center; }
  header p { color: rgba(255,255,255,0.88); font-size: 1.05rem; margin-top: 10px; max-width: 640px; margin-left: auto; margin-right: auto; }
  h1 { font-size: clamp(1.6rem, 4vw, 2.4rem); font-weight: 800; letter-spacing: -0.5px; }
  .flag { font-size: 0.85rem; background: rgba(255,255,255,0.15); border-radius: 20px; padding: 4px 14px; display: inline-block; margin-bottom: 16px; letter-spacing: 1px; }
  .tool-card { background: white; border-radius: var(--radius); box-shadow: 0 4px 32px rgba(0,0,0,0.10); margin: -48px auto 40px; max-width: 720px; padding: 36px 32px; position: relative; z-index: 10; }
  .input-group { margin-bottom: 20px; }
  .input-group label { display: block; font-weight: 600; font-size: 0.9rem; margin-bottom: 6px; color: var(--text); }
  .input-group .hint { font-size: 0.78rem; color: var(--muted); margin-bottom: 8px; }
  input[type="number"], select { width: 100%; padding: 10px 14px; border: 1.5px solid var(--border); border-radius: 8px; font-size: 1rem; background: white; }
  input[type="number"]:focus, select:focus { outline: none; border-color: var(--brand); }
  .seg-row { display: flex; gap: 8px; flex-wrap: wrap; }
  .seg-btn { flex: 1; min-width: 100px; padding: 10px 12px; border: 1.5px solid var(--border); border-radius: 8px; background: white; font-size: 0.85rem; font-weight: 600; cursor: pointer; text-align: center; color: var(--text); }
  .seg-btn.active { background: var(--brand); color: white; border-color: var(--brand); }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 500px) { .two-col { grid-template-columns: 1fr; } }
  .results { background: var(--brand-light); border-radius: var(--radius); padding: 24px; margin-top: 24px; display: none; }
  .results.show { display: block; }
  .result-hero { text-align: center; padding: 12px 0 20px; }
  .result-hero .value { font-size: 2.2rem; font-weight: 800; color: var(--brand); }
  .result-hero .label { font-size: 0.85rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
  .results-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 16px; }
  @media (max-width: 500px) { .results-grid { grid-template-columns: 1fr 1fr; } }
  .result-box { background: white; border-radius: 8px; padding: 12px 10px; text-align: center; }
  .result-box .label { font-size: 0.68rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; }
  .result-box .value { font-size: 1.05rem; font-weight: 700; color: var(--brand); }
  .result-box.accent .value { color: var(--accent); }
  .band-breakdown { background: white; border-radius: 8px; padding: 14px 16px; margin-top: 12px; font-size: 0.85rem; }
  .band-breakdown div { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid var(--border); }
  .band-breakdown div:last-child { border-bottom: none; font-weight: 700; }
  .btn { background: var(--brand); color: white; border: none; border-radius: 8px; padding: 14px 28px; font-size: 1rem; font-weight: 600; cursor: pointer; width: 100%; margin-top: 8px; transition: background 0.2s; }
  .btn:hover { background: var(--brand-dark); }
  .content { max-width: 760px; margin: 0 auto; padding: 0 20px 60px; }
  h2 { font-size: 1.4rem; font-weight: 700; margin: 40px 0 14px; }
  h3 { font-size: 1.1rem; font-weight: 600; margin: 24px 0 10px; }
  p { color: #374151; margin-bottom: 14px; font-size: 0.95rem; }
  ul { padding-left: 20px; margin-bottom: 14px; }
  li { color: #374151; font-size: 0.95rem; margin-bottom: 6px; }
  .table-wrap { overflow-x: auto; margin: 20px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
  th { background: var(--brand); color: white; padding: 10px 12px; text-align: left; white-space: nowrap; }
  td { padding: 9px 12px; border-bottom: 1px solid var(--border); white-space: nowrap; }
  tr:nth-child(even) td { background: #f8fafc; }
  .sat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0 40px; }
  @media (max-width: 500px) { .sat-grid { grid-template-columns: 1fr; } }
  .sat-link { display: block; background: white; border: 1.5px solid var(--border); border-radius: 10px; padding: 16px 18px; text-decoration: none; color: var(--text); transition: border-color .15s; }
  .sat-link:hover { border-color: var(--brand); }
  .sat-link .t { font-weight: 700; font-size: 0.95rem; margin-bottom: 3px; }
  .sat-link .d { font-size: 0.8rem; color: var(--muted); }
  .cta-box { background: #111827; color: white; border-radius: var(--radius); padding: 36px 32px; margin: 40px 0; }
  .cta-box h2 { color: white; margin-top: 0; font-size: 1.35rem; }
  .cta-box p { color: rgba(255,255,255,0.88); }
  .cta-box li { color: rgba(255,255,255,0.82) !important; }
  .cta-box ul { color: white; }
  .cta-btn { display: inline-block; background: var(--accent); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 700; font-size: 1rem; margin-top: 20px; transition: opacity 0.2s; }
  .cta-btn:hover { opacity: 0.88; }
  .faq { margin: 40px 0; }
  .faq-item { border: 1px solid var(--border); border-radius: 8px; margin-bottom: 10px; overflow: hidden; }
  .faq-q { padding: 16px 20px; font-weight: 600; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-size: 0.95rem; background: white; }
  .faq-q:hover { background: var(--brand-light); }
  .faq-q::after { content: '+'; font-size: 1.2rem; color: var(--brand); flex-shrink: 0; }
  .faq-q.open::after { content: '−'; }
  .faq-a { display: none; padding: 0 20px 16px; font-size: 0.9rem; color: #374151; background: white; }
  .faq-a.show { display: block; }
  footer { background: var(--brand-dark); color: rgba(255,255,255,0.6); text-align: center; padding: 28px 20px; font-size: 0.8rem; }
  footer p { color: #9ca3af; }
  footer a { color: rgba(255,255,255,0.7); }
  @media (max-width: 600px) { .tool-card { margin: -32px 12px 32px; padding: 24px 18px; } }
  .eeat-section { background: white; border: 1px solid var(--border); border-radius: var(--radius); padding: 28px; margin: 32px 0; }
  .eeat-title { font-size: 1.2rem; font-weight: 800; color: var(--text); margin-bottom: 20px; display: flex; align-items: center; gap: 10px; border-bottom: 2px solid var(--brand-light); padding-bottom: 12px; }
  .eeat-title svg { color: var(--brand); flex-shrink: 0; }
  .eeat-grid { display: grid; grid-template-columns: 1.1fr 1fr; gap: 28px; }
  @media (max-width: 640px) { .eeat-grid { grid-template-columns: 1fr; gap: 20px; } }
  .eeat-author-card { display: flex; gap: 14px; align-items: flex-start; }
  .eeat-avatar { width: 50px; height: 50px; border-radius: 50%; background: var(--brand); display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 1.1rem; flex-shrink: 0; }
  .eeat-author-info h3 { font-size: 1rem; font-weight: 700; color: var(--text); margin-bottom: 2px; }
  .eeat-author-subtitle { font-size: 0.76rem; font-weight: 700; color: var(--brand); text-transform: uppercase; letter-spacing: .5px; margin-bottom: 8px; }
  .eeat-author-info p { font-size: 0.85rem; color: var(--muted); line-height: 1.6; }
  .eeat-compliance { display: flex; flex-direction: column; gap: 14px; }
  .eeat-compliance-item { display: flex; gap: 10px; align-items: flex-start; }
  .eeat-compliance-icon { color: var(--brand); flex-shrink: 0; margin-top: 3px; }
  .eeat-compliance-text h4 { font-size: 0.88rem; font-weight: 700; color: var(--text); margin-bottom: 2px; }
  .eeat-compliance-text p { font-size: 0.8rem; color: var(--muted); line-height: 1.5; margin-bottom: 0; }
  .eeat-compliance-text a { color: var(--brand); text-decoration: underline; }
  .compare-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 600px) { .compare-grid { grid-template-columns: 1fr; } }
  .offer-card { background: #f8fafc; border: 1.5px solid var(--border); border-radius: 10px; padding: 16px; }
  .offer-card h3 { font-size: 0.95rem; color: var(--brand); margin-bottom: 12px; }
  .compare-result-row { display: flex; justify-content: space-between; align-items: center; padding: 9px 0; border-bottom: 1px solid var(--border); font-size: 0.9rem; }
  .compare-result-row:last-child { border-bottom: none; font-weight: 700; }
  .winner-badge { background: var(--success); color: white; font-size: 0.68rem; font-weight: 700; padding: 2px 8px; border-radius: 10px; margin-left: 6px; }
  .period-seg { margin-bottom: 16px; }
`;

const SATELLITES_NAV = [
  { slug: 'paye-calculator', title: 'PAYE Calculator', desc: 'Breakdown of PAYE deductions' },
  { slug: 'national-insurance-calculator', title: 'National Insurance Calculator', desc: 'NI contributions explained' },
  { slug: 'dividend-tax-calculator', title: 'Dividend Tax Calculator', desc: 'Salary + dividend combined' },
  { slug: 'self-employed-tax-calculator', title: 'Self-Employed Tax Calculator', desc: 'Self Assessment, Class 4 NI' },
  { slug: 'student-loan-repayment-calculator', title: 'Student Loan Repayment Calculator', desc: 'Plan 1/2/4/5/Postgrad' },
  { slug: 'redundancy-pay-calculator', title: 'Redundancy Pay Calculator', desc: 'Statutory redundancy estimate' },
  { slug: 'maternity-pay-calculator', title: 'Maternity Pay Calculator', desc: 'SMP week-by-week estimate' },
  { slug: 'pension-contribution-calculator', title: 'Pension Contribution Calculator', desc: 'Auto-enrolment & salary sacrifice' },
  { slug: 'required-salary-calculator', title: 'Required Salary Calculator', desc: 'Gross salary needed for a target take-home' },
  { slug: 'compare-two-salaries-calculator', title: 'Compare Two Salaries', desc: 'Job offer take-home pay, side by side' },
  { slug: 'salary-after-tax', title: 'Salary After Tax — Browse by Amount', desc: '£15,000 to £150,000, pick your salary' },
  { slug: 'uk-tax-calculator-2025-26', title: 'Historical Tax Years', desc: '2023/24, 2024/25, 2025/26 rates' },
  { slug: 'nhs-pay-bands', title: 'NHS Pay Bands', desc: 'Agenda for Change, Band 2 to Band 9' }
];

function satGridHtml(excludeSlug) {
  const items = [{ slug: '', title: 'Take-Home Pay Calculator', desc: 'Full salary breakdown' }, ...SATELLITES_NAV]
    .filter(s => s.slug !== excludeSlug);
  return items.map(s => `<a class="sat-link" href="/${s.slug}${s.slug ? '/' : ''}"><div class="t">${s.title}</div><div class="d">${s.desc}</div></a>`).join('\n');
}

// --- CTA snippet families (3 total — see plan: accountancy / financial-advice / payroll-software) ---
const CTA_ACCOUNTANCY = `
<div class="cta-box">
  <h2>Get Your Books &amp; Tax Handled Properly</h2>
  <p>This calculator gives an estimate — but self-employed and dividend income both come with Self Assessment obligations, allowable expenses, and filing deadlines that are easy to get wrong without support.</p>
  <ul>
    <li><strong>New to self-employment or a limited company:</strong> get set up correctly from day one — VAT registration, expense tracking, Self Assessment.</li>
    <li><strong>Mixed salary + dividend income:</strong> an accountant can model the most tax-efficient salary/dividend split for a director-shareholder.</li>
    <li><strong>Approaching a filing deadline:</strong> avoid late-filing penalties with a fixed-fee online accountant.</li>
    <li><strong>Growing side income:</strong> know exactly when you cross into needing to register for Self Assessment.</li>
  </ul>
  <p>Online accountants like Crunch, Osome and Tide Accounting handle Self Assessment and limited company filings at a fixed monthly fee, built for freelancers and small companies.</p>
  <a href="#" class="cta-btn" target="_blank" rel="noopener">Compare Online Accountants →</a>
</div>`;

const CTA_FINANCIAL_ADVICE = `
<div class="cta-box">
  <h2>Get Independent Financial Advice</h2>
  <p>The figure above is an estimate of what you're entitled to or what it costs you — deciding what to actually do with it (invest, overpay debt, top up a pension) is a bigger decision worth getting right.</p>
  <ul>
    <li><strong>Received a redundancy payout:</strong> understand tax-free thresholds and how to make a lump sum work for you long-term.</li>
    <li><strong>Planning parental leave:</strong> budget around the drop from full pay to statutory rate, and check what protections apply.</li>
    <li><strong>Deciding whether to overpay a student loan:</strong> for many people investing the surplus outperforms early repayment — but it depends on your plan type and income trajectory.</li>
    <li><strong>Reviewing pension contributions:</strong> small percentage changes compound significantly over a career.</li>
  </ul>
  <p>An FCA-regulated independent financial adviser can model your specific numbers — free directories like Unbiased.co.uk match you with a local IFA.</p>
  <a href="#" class="cta-btn" target="_blank" rel="noopener">Find an Independent Financial Adviser →</a>
</div>`;

const CTA_PAYROLL_SOFTWARE = `
<div class="cta-box">
  <h2>Running Payroll for Your Business?</h2>
  <p>This calculator is built for individuals checking their own numbers. If you're running payroll for a team, a dedicated platform automates this calculation for every employee, every pay run.</p>
  <ul>
    <li><strong>Small business, first hire:</strong> set up PAYE and auto-enrolment correctly from day one.</li>
    <li><strong>Growing team:</strong> automate payslips, RTI submissions and pension contributions.</li>
    <li><strong>Multiple pay rates or contractors:</strong> handle mixed PAYE/self-employed workforces in one place.</li>
    <li><strong>Switching from spreadsheets:</strong> reduce manual errors on tax code changes and NI category switches.</li>
  </ul>
  <p>Cloud payroll platforms like Xero, QuickBooks and BrightPay handle Income Tax, NI, student loan and pension deductions automatically.</p>
  <a href="#" class="cta-btn" target="_blank" rel="noopener">Compare Payroll Software →</a>
</div>`;

function eeatSection(pageTitle, avatarInitials) {
  return `
  <div class="eeat-section">
    <h2 class="eeat-title">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>
      Transparency &amp; Methodology
    </h2>
    <div class="eeat-grid">
      <div class="eeat-author-card">
        <div class="eeat-avatar">${avatarInitials}</div>
        <div class="eeat-author-info">
          <h3>${pageTitle}</h3>
          <div class="eeat-author-subtitle">Independent, Open-Source Estimator</div>
          <p>An independent calculator applying published HMRC/gov.scot/DWP rates deterministically — no AI estimate, no official affiliation.</p>
        </div>
      </div>
      <div class="eeat-compliance">
        <div class="eeat-compliance-item">
          <svg class="eeat-compliance-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
          <div class="eeat-compliance-text"><h4>Methodology &amp; Sources</h4><p>Figures are public HMRC/gov.scot/DWP rates. For your exact position, use <a href="https://www.gov.uk/estimate-income-tax" target="_blank" rel="noopener">gov.uk/estimate-income-tax</a>.</p></div>
        </div>
        <div class="eeat-compliance-item">
          <svg class="eeat-compliance-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          <div class="eeat-compliance-text"><h4>Not Tax or Legal Advice</h4><p>Information only. Consult the <a href="https://www.tax.org.uk/" target="_blank" rel="noopener">Chartered Institute of Taxation</a> or an adviser via the <a href="https://register.fca.org.uk/" target="_blank" rel="noopener">FCA Register</a>.</p></div>
        </div>
        <div class="eeat-compliance-item">
          <svg class="eeat-compliance-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path><path d="M9 18c-4.51 2-5-2-7-2"></path></svg>
          <div class="eeat-compliance-text"><h4>Open Source</h4><p>Formulas are public. Inspect on <a href="https://github.com/sadiyaqeen92639572-cloud/uk-take-home-pay-calculator" target="_blank" rel="noopener">GitHub</a>.</p></div>
        </div>
      </div>
    </div>
  </div>`;
}

function faqHtml(faqs) {
  return `<div class="faq"><h2>Frequently Asked Questions</h2>` +
    faqs.map(f => `<div class="faq-item"><div class="faq-q" onclick="toggleFaq(this)">${f.q}</div><div class="faq-a">${f.a}</div></div>`).join('\n') +
    `</div>`;
}

function faqJsonLd(faqs) {
  return faqs.map(f => ({ "@type": "Question", "name": f.q, "acceptedAnswer": { "@type": "Answer", "text": f.a.replace(/<[^>]+>/g, '') } }));
}

function pageShell({ slug, title, metaTitle, metaDesc, h1, intro, toolHtml, toolJs, extraContent, faqs, ctaSnippet, avatarInitials }) {
  const canonical = `${SITE_URL}/${slug}/`;
  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${metaTitle}</title>
<meta name="description" content="${metaDesc}">
<link rel="canonical" href="${canonical}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" href="/favicon.png">
<meta property="og:title" content="${metaTitle}">
<meta property="og:description" content="${metaDesc}">
<meta property="og:type" content="website">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${SITE_URL}/og-image.svg">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${SITE_URL}/og-image.svg">
<meta name="google-site-verification" content="${GSC_TAG}" />

<script type="application/ld+json">
${JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebApplication", "name": title, "url": canonical, "description": metaDesc, "applicationCategory": "FinanceApplication", "operatingSystem": "Any", "inLanguage": "en-GB", "offers": { "@type": "Offer", "price": "0", "priceCurrency": "GBP" }, "areaServed": { "@type": "Country", "name": "United Kingdom" } },
    { "@type": "FAQPage", "mainEntity": faqJsonLd(faqs) },
    { "@type": "BreadcrumbList", "itemListElement": [ { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL + "/" }, { "@type": "ListItem", "position": 2, "name": title, "item": canonical } ] }
  ]
}, null, 2)}
</script>

<style>${CSS}</style>
</head>
<body>

<header>
  <div class="flag">🇬🇧 UK Payroll · 2026/27 Rates</div>
  <h1>${h1}</h1>
  <p>${intro}</p>
</header>

<div class="tool-card">
${toolHtml}
</div>

<div class="content">
  <h2>Explore More Payroll Calculators</h2>
  <div class="sat-grid">${satGridHtml(slug)}</div>

  ${extraContent}

  ${ctaSnippet}

  ${eeatSection(title, avatarInitials)}

  ${faqHtml(faqs)}
</div>

<footer>
  <p>Information only — not tax or legal advice. Data based on 2026/27 rates.<br>
  Always verify at <a href="https://www.gov.uk/estimate-income-tax" target="_blank" rel="noopener">gov.uk/estimate-income-tax</a>.</p>
</footer>

<script>
function fmt(n) { return '£' + Math.round(n).toLocaleString('en-GB'); }
function bandedTax(income, bands) {
  let tax = 0;
  for (const [lo, hi, rate] of bands) { if (income > lo) tax += (Math.min(income, hi) - lo) * rate; }
  return tax;
}
function toggleFaq(el) { el.classList.toggle('open'); el.nextElementSibling.classList.toggle('show'); }
${toolJs}
</script>

</body>
</html>`;
}

// ============ SATELLITE DEFINITIONS ============

const PAGES = [];

// 1. PAYE calculator — reuses core take-home logic, PAYE framing
PAGES.push({
  slug: 'paye-calculator',
  title: 'PAYE Calculator',
  metaTitle: 'PAYE Calculator UK 2026/27 — Income Tax & NI Breakdown',
  metaDesc: 'Free PAYE calculator. Enter salary → instant Income Tax and National Insurance breakdown under PAYE. England, Scotland, Wales. 2026/27 rates.',
  h1: 'PAYE Calculator',
  intro: 'See exactly how your PAYE deductions are calculated — Income Tax and National Insurance, England, Scotland, Wales & NI.',
  avatarInitials: 'PY',
  ctaSnippet: CTA_PAYROLL_SOFTWARE,
  toolHtml: `
  <div class="input-group"><label>Annual Gross Salary (£)</label><input type="number" id="salary" min="0" step="500" value="35000"></div>
  <div class="input-group"><label>Region</label>
    <div class="seg-row" id="regionSeg">
      <div class="seg-btn active" data-val="rest_uk">England / Wales / NI</div>
      <div class="seg-btn" data-val="scotland">Scotland</div>
    </div>
  </div>
  <button class="btn" onclick="calculate()">Calculate PAYE →</button>
  <div class="results" id="results">
    <div class="result-hero"><div class="value" id="r-takehome">—</div><div class="label">Annual Take-Home Pay</div></div>
    <div class="band-breakdown">
      <div><span>Income Tax</span><span id="r-it">—</span></div>
      <div><span>National Insurance</span><span id="r-ni">—</span></div>
      <div><span>Take-Home Pay</span><span id="r-total">—</span></div>
    </div>
  </div>`,
  toolJs: `
const PT=12570, UEL=50270;
function personalAllowance(income){ if(income<=100000) return 12570; return Math.max(0,12570-(income-100000)/2); }
function incomeTax(taxable, region){
  const pa = personalAllowance(taxable);
  if (region==='scotland') return bandedTax(taxable,[[0,pa,0],[pa,16537,0.19],[16537,29526,0.20],[29526,43662,0.21],[43662,75000,0.42],[75000,125140,0.45],[125140,Infinity,0.48]]);
  return bandedTax(taxable,[[0,pa,0],[pa,50270,0.20],[50270,125140,0.40],[125140,Infinity,0.45]]);
}
function nationalInsurance(gross){ return bandedTax(gross,[[0,PT,0],[PT,UEL,0.08],[UEL,Infinity,0.02]]); }
document.querySelectorAll('#regionSeg .seg-btn').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('#regionSeg .seg-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');}));
function calculate(){
  const gross=parseFloat(document.getElementById('salary').value)||0;
  const region=document.querySelector('#regionSeg .seg-btn.active').dataset.val==='scotland'?'scotland':'rest_uk';
  const it=incomeTax(gross,region), ni=nationalInsurance(gross), takeHome=gross-it-ni;
  document.getElementById('r-takehome').textContent=fmt(takeHome);
  document.getElementById('r-it').textContent=fmt(it);
  document.getElementById('r-ni').textContent=fmt(ni);
  document.getElementById('r-total').textContent=fmt(takeHome);
  document.getElementById('results').classList.add('show');
}`,
  extraContent: `
  <h2>What Is PAYE?</h2>
  <p>Pay As You Earn (PAYE) is how HMRC collects Income Tax and National Insurance directly from your salary each pay period, before you receive it. Your employer calculates and deducts both based on your tax code.</p>
  <h2>Common Tax Codes 2026/27</h2>
  <div class="table-wrap"><table><tr><th>Tax Code</th><th>Meaning</th></tr>
  <tr><td>1257L</td><td>Standard code — full £12,570 Personal Allowance</td></tr>
  <tr><td>BR</td><td>All income taxed at basic rate (20%), no allowance — usually a second job</td></tr>
  <tr><td>D0</td><td>All income taxed at higher rate (40%)</td></tr>
  <tr><td>NT</td><td>No tax deducted</td></tr>
  <tr><td>K-prefix</td><td>Negative allowance — extra income being taxed (e.g. company benefits)</td></tr>
  </table></div>`,
  faqs: [
    { q: 'What is PAYE?', a: 'Pay As You Earn is the system HMRC uses to collect Income Tax and National Insurance directly from your salary each pay period, calculated by your employer based on your tax code.' },
    { q: 'What does tax code 1257L mean?', a: '1257L is the standard 2026/27 tax code, giving you the full £12,570 Personal Allowance spread evenly across the tax year.' },
    { q: 'Why did my PAYE deduction change this month?', a: 'Common causes: a bonus pushed you into a higher tax band temporarily, your tax code changed, or you crossed the National Insurance Upper Earnings Limit.' },
    { q: 'Can I check my PAYE deductions are correct?', a: 'Yes — compare your payslip figures against this calculator or HMRC\'s own estimator at gov.uk/estimate-income-tax using your gross pay and tax code.' }
  ]
});

// 2. National Insurance calculator — NI only, detailed
PAGES.push({
  slug: 'national-insurance-calculator',
  title: 'National Insurance Calculator',
  metaTitle: 'National Insurance Calculator UK 2026/27 — Employee NI',
  metaDesc: 'Free National Insurance calculator. Enter salary → instant employee Class 1 NI breakdown by band. 2026/27 thresholds and rates.',
  h1: 'National Insurance Calculator',
  intro: 'See exactly how much employee National Insurance you pay, broken down by band.',
  avatarInitials: 'NI',
  ctaSnippet: CTA_PAYROLL_SOFTWARE,
  toolHtml: `
  <div class="input-group"><label>Annual Gross Salary (£)</label><input type="number" id="salary" min="0" step="500" value="35000"></div>
  <button class="btn" onclick="calculate()">Calculate NI →</button>
  <div class="results" id="results">
    <div class="result-hero"><div class="value" id="r-ni">—</div><div class="label">Annual Employee NI</div></div>
    <div class="band-breakdown">
      <div><span>0% — up to £12,570</span><span>£0</span></div>
      <div><span>8% — £12,570 to £50,270</span><span id="r-band2">—</span></div>
      <div><span>2% — above £50,270</span><span id="r-band3">—</span></div>
      <div><span>Total NI</span><span id="r-total">—</span></div>
    </div>
  </div>`,
  toolJs: `
const PT=12570, UEL=50270;
function calculate(){
  const gross=parseFloat(document.getElementById('salary').value)||0;
  const band2=Math.max(0,Math.min(gross,UEL)-PT)*0.08;
  const band3=Math.max(0,gross-UEL)*0.02;
  const total=band2+band3;
  document.getElementById('r-ni').textContent=fmt(total);
  document.getElementById('r-band2').textContent=fmt(band2);
  document.getElementById('r-band3').textContent=fmt(band3);
  document.getElementById('r-total').textContent=fmt(total);
  document.getElementById('results').classList.add('show');
}`,
  extraContent: `
  <h2>National Insurance Thresholds 2026/27</h2>
  <div class="table-wrap"><table><tr><th>Band</th><th>Rate</th></tr>
  <tr><td>£0 – £12,570 (Primary Threshold)</td><td>0%</td></tr>
  <tr><td>£12,571 – £50,270 (Upper Earnings Limit)</td><td>8%</td></tr>
  <tr><td>Above £50,270</td><td>2%</td></tr>
  </table></div>
  <p>National Insurance is the same across England, Scotland, Wales and Northern Ireland — unlike Income Tax, it is not devolved.</p>`,
  faqs: [
    { q: 'What is the National Insurance Primary Threshold for 2026/27?', a: '£12,570 per year (£242/week) — you start paying employee NI once your earnings exceed this, matching the Income Tax Personal Allowance.' },
    { q: 'What is the National Insurance rate above £50,270?', a: '2% on all earnings above the Upper Earnings Limit of £50,270, down from 8% below that threshold.' },
    { q: 'Is National Insurance different in Scotland?', a: 'No — National Insurance rates and thresholds are set UK-wide by Westminster and are identical in Scotland, England, Wales and Northern Ireland. Only Income Tax bands differ by nation.' },
    { q: 'Does NI stop at State Pension age?', a: 'Yes — once you reach State Pension age, you stop paying employee National Insurance even if you continue working, though Income Tax still applies.' }
  ]
});

// 3. Dividend tax calculator
PAGES.push({
  slug: 'dividend-tax-calculator',
  title: 'Dividend Tax Calculator',
  metaTitle: 'Dividend Tax Calculator UK 2026/27 — Salary + Dividends',
  metaDesc: 'Free dividend tax calculator. Enter salary and dividend income → instant dividend tax at basic/higher/additional rates. 2026/27 £500 allowance.',
  h1: 'Dividend Tax Calculator',
  intro: 'Combine salary and dividend income to see exactly how much dividend tax you owe — common for company directors.',
  avatarInitials: 'DT',
  ctaSnippet: CTA_ACCOUNTANCY,
  toolHtml: `
  <div class="two-col">
    <div class="input-group"><label>Annual Salary (£)</label><input type="number" id="salary" min="0" step="500" value="12570"></div>
    <div class="input-group"><label>Annual Dividend Income (£)</label><input type="number" id="dividends" min="0" step="500" value="30000"></div>
  </div>
  <button class="btn" onclick="calculate()">Calculate Dividend Tax →</button>
  <div class="results" id="results">
    <div class="result-hero"><div class="value" id="r-divtax">—</div><div class="label">Total Dividend Tax</div></div>
    <div class="band-breakdown">
      <div><span>Dividend allowance used (£500 @ 0%)</span><span id="r-allow">—</span></div>
      <div><span>Basic rate (10.75%)</span><span id="r-basic">—</span></div>
      <div><span>Higher rate (35.75%)</span><span id="r-higher">—</span></div>
      <div><span>Additional rate (39.35%)</span><span id="r-add">—</span></div>
    </div>
  </div>`,
  toolJs: `
function personalAllowance(income){ if(income<=100000) return 12570; return Math.max(0,12570-(income-100000)/2); }
function calculate(){
  const salary=parseFloat(document.getElementById('salary').value)||0;
  const div=parseFloat(document.getElementById('dividends').value)||0;
  const pa=personalAllowance(salary+div);
  const allowance=500;
  const taxableDivStart=Math.max(pa,salary); // dividends stack on top of salary, using remaining PA if salary < PA
  const divAfterAllowance=Math.max(0,div-allowance);
  const bands=[[0,50270,0.1075],[50270,125140,0.3575],[125140,Infinity,0.3935]];
  let tax=0, basic=0, higher=0, add=0;
  let cursor=taxableDivStart;
  let remaining=divAfterAllowance;
  for (const [lo,hi,rate] of bands){
    if (remaining<=0) break;
    const bandRemaining=Math.max(0,hi-Math.max(cursor,lo));
    const amt=Math.min(remaining,bandRemaining);
    if (amt>0){
      const t=amt*rate; tax+=t;
      if(rate===0.1075) basic+=t; else if(rate===0.3575) higher+=t; else add+=t;
      remaining-=amt; cursor+=amt;
    }
  }
  document.getElementById('r-divtax').textContent=fmt(tax);
  document.getElementById('r-allow').textContent=fmt(Math.min(div,allowance));
  document.getElementById('r-basic').textContent=fmt(basic);
  document.getElementById('r-higher').textContent=fmt(higher);
  document.getElementById('r-add').textContent=fmt(add);
  document.getElementById('results').classList.add('show');
}`,
  extraContent: `
  <h2>Dividend Tax Rates 2026/27</h2>
  <div class="table-wrap"><table><tr><th>Band</th><th>Rate</th></tr>
  <tr><td>Dividend allowance (per year)</td><td>£500 @ 0%</td></tr>
  <tr><td>Basic rate</td><td>10.75%</td></tr>
  <tr><td>Higher rate</td><td>35.75%</td></tr>
  <tr><td>Additional rate</td><td>39.35%</td></tr>
  </table></div>
  <p>Dividends are taxed after salary/other income fills your Personal Allowance and lower bands — so your salary level determines which dividend band you start in. Common for limited company directors who pay themselves a low salary plus dividends.</p>`,
  faqs: [
    { q: 'What is the dividend allowance for 2026/27?', a: 'The first £500 of dividend income each tax year is tax-free, regardless of your other income.' },
    { q: 'How are dividends taxed if I also have a salary?', a: 'Dividends are treated as the top slice of your income — your salary and other income use up the Personal Allowance and lower tax bands first, and dividends are taxed at whichever band they fall into above that.' },
    { q: 'Why do company directors take a low salary plus dividends?', a: 'Dividends aren\'t subject to National Insurance, so a low salary (often around the Personal Allowance) plus dividends is typically more tax-efficient than an equivalent full salary — subject to Corporation Tax already paid on company profits.' },
    { q: 'What are the dividend tax rates for 2026/27?', a: '10.75% basic rate, 35.75% higher rate, 39.35% additional rate — each roughly 8.75 percentage points above the equivalent Income Tax band.' }
  ]
});

// 4. Self-employed tax calculator
PAGES.push({
  slug: 'self-employed-tax-calculator',
  title: 'Self-Employed Tax Calculator',
  metaTitle: 'Self-Employed Tax Calculator UK 2026/27 — Income Tax & Class 4 NI',
  metaDesc: 'Free self-employed tax calculator. Enter your profit → instant Income Tax and Class 4 National Insurance for Self Assessment. 2026/27 rates.',
  h1: 'Self-Employed Tax Calculator',
  intro: 'Estimate Income Tax and Class 4 National Insurance on your self-employed profit for Self Assessment.',
  avatarInitials: 'SE',
  ctaSnippet: CTA_ACCOUNTANCY,
  toolHtml: `
  <div class="input-group"><label>Annual Self-Employed Profit (£)</label><div class="hint">Income minus allowable business expenses</div><input type="number" id="profit" min="0" step="500" value="40000"></div>
  <button class="btn" onclick="calculate()">Calculate Tax Due →</button>
  <div class="results" id="results">
    <div class="result-hero"><div class="value" id="r-total">—</div><div class="label">Total Tax &amp; NI Due</div></div>
    <div class="band-breakdown">
      <div><span>Income Tax</span><span id="r-it">—</span></div>
      <div><span>Class 4 NI</span><span id="r-c4">—</span></div>
      <div><span>Profit After Tax</span><span id="r-net">—</span></div>
    </div>
  </div>`,
  toolJs: `
function personalAllowance(income){ if(income<=100000) return 12570; return Math.max(0,12570-(income-100000)/2); }
function calculate(){
  const profit=parseFloat(document.getElementById('profit').value)||0;
  const pa=personalAllowance(profit);
  const it=bandedTax(profit,[[0,pa,0],[pa,50270,0.20],[50270,125140,0.40],[125140,Infinity,0.45]]);
  const c4=bandedTax(profit,[[0,12570,0],[12570,50270,0.06],[50270,Infinity,0.02]]);
  const total=it+c4;
  document.getElementById('r-total').textContent=fmt(total);
  document.getElementById('r-it').textContent=fmt(it);
  document.getElementById('r-c4').textContent=fmt(c4);
  document.getElementById('r-net').textContent=fmt(profit-total);
  document.getElementById('results').classList.add('show');
}`,
  extraContent: `
  <h2>How Self-Employed Tax Works</h2>
  <p>Unlike employees, self-employed people pay Income Tax and National Insurance once a year via Self Assessment, not deducted automatically from pay. You're taxed on <strong>profit</strong> (income minus allowable expenses), not turnover.</p>
  <div class="table-wrap"><table><tr><th>Contribution</th><th>Rate 2026/27</th></tr>
  <tr><td>Income Tax</td><td>Same bands as employees: 0% / 20% / 40% / 45%</td></tr>
  <tr><td>Class 4 NI</td><td>6% on profit £12,570–£50,270, 2% above</td></tr>
  <tr><td>Class 2 NI</td><td>Not payable if profits exceed the Small Profits Threshold — NI credits applied automatically since the 2024 reform</td></tr>
  </table></div>
  <p>Payments on account may also apply — HMRC can require you to pay 50% of next year's estimated bill in advance, twice a year.</p>`,
  faqs: [
    { q: 'How is self-employed tax different from PAYE?', a: 'Self-employed people pay Income Tax and Class 4 NI annually via Self Assessment based on profit, rather than having it deducted automatically each payday like PAYE employees.' },
    { q: 'What is Class 4 National Insurance?', a: 'Class 4 NI is paid by self-employed people on profits above £12,570 — 6% between £12,570 and £50,270, then 2% above, calculated alongside Income Tax via Self Assessment.' },
    { q: 'Do I still need to pay Class 2 NI?', a: 'Since the April 2024 reform, most self-employed people with profits above the Small Profits Threshold get NI credits automatically without paying Class 2 — though voluntary Class 2 payments remain available for those below the threshold who want to protect their State Pension record.' },
    { q: 'What are payments on account?', a: 'If your Self Assessment tax bill exceeds £1,000, HMRC typically requires two advance "payments on account" (each 50% of your prior year\'s bill) toward the following year\'s tax, due 31 January and 31 July.' }
  ]
});

// 5. Student loan repayment calculator
PAGES.push({
  slug: 'student-loan-repayment-calculator',
  title: 'Student Loan Repayment Calculator',
  metaTitle: 'Student Loan Repayment Calculator UK 2026/27 — All Plans',
  metaDesc: 'Free student loan repayment calculator. Enter salary and plan (1/2/4/5/Postgrad) → instant annual and monthly repayment. 2026/27 thresholds.',
  h1: 'Student Loan Repayment Calculator',
  intro: 'See exactly how much you repay on your student loan based on salary and plan type.',
  avatarInitials: 'SL',
  ctaSnippet: CTA_FINANCIAL_ADVICE,
  toolHtml: `
  <div class="two-col">
    <div class="input-group"><label>Annual Gross Salary (£)</label><input type="number" id="salary" min="0" step="500" value="35000"></div>
    <div class="input-group"><label>Student Loan Plan</label>
      <select id="loanPlan">
        <option value="plan1">Plan 1</option>
        <option value="plan2" selected>Plan 2</option>
        <option value="plan4">Plan 4 (Scotland)</option>
        <option value="plan5">Plan 5</option>
        <option value="postgrad">Postgraduate Loan</option>
      </select>
    </div>
  </div>
  <button class="btn" onclick="calculate()">Calculate Repayment →</button>
  <div class="results" id="results">
    <div class="result-hero"><div class="value" id="r-annual">—</div><div class="label">Annual Repayment</div></div>
    <div class="band-breakdown">
      <div><span>Monthly</span><span id="r-monthly">—</span></div>
      <div><span>Weekly</span><span id="r-weekly">—</span></div>
      <div><span>Threshold used</span><span id="r-threshold">—</span></div>
    </div>
  </div>`,
  toolJs: `
const PLANS={plan1:{t:26900,r:0.09},plan2:{t:29385,r:0.09},plan4:{t:33795,r:0.09},plan5:{t:25000,r:0.09},postgrad:{t:21000,r:0.06}};
function calculate(){
  const gross=parseFloat(document.getElementById('salary').value)||0;
  const plan=PLANS[document.getElementById('loanPlan').value];
  const annual=Math.max(0,gross-plan.t)*plan.r;
  document.getElementById('r-annual').textContent=fmt(annual);
  document.getElementById('r-monthly').textContent=fmt(annual/12);
  document.getElementById('r-weekly').textContent=fmt(annual/52);
  document.getElementById('r-threshold').textContent=fmt(plan.t);
  document.getElementById('results').classList.add('show');
}`,
  extraContent: `
  <h2>Student Loan Plans 2026/27</h2>
  <div class="table-wrap"><table><tr><th>Plan</th><th>Threshold</th><th>Rate</th></tr>
  <tr><td>Plan 1</td><td>£26,900/year</td><td>9%</td></tr>
  <tr><td>Plan 2</td><td>£29,385/year</td><td>9%</td></tr>
  <tr><td>Plan 4 (Scotland)</td><td>£33,795/year</td><td>9%</td></tr>
  <tr><td>Plan 5</td><td>£25,000/year</td><td>9%</td></tr>
  <tr><td>Postgraduate Loan</td><td>£21,000/year</td><td>6%</td></tr>
  </table></div>
  <p>If you have both an undergraduate plan and a Postgraduate Loan, you repay both simultaneously — 9% above the undergraduate threshold plus 6% above the postgraduate threshold.</p>`,
  faqs: [
    { q: 'Which student loan plan am I on?', a: 'It depends on when and where you started your course: Plan 1 (pre-2012 England/Wales, or Northern Ireland), Plan 2 (2012–2023 England/Wales), Plan 5 (from August 2023 England), Plan 4 (Scotland), Postgraduate Loan (Masters/PhD). Check your account at gov.uk/sign-in-to-manage-your-student-loan-balance.' },
    { q: 'How much do I repay on a student loan?', a: 'You repay 9% of income above your plan\'s threshold (6% for Postgraduate Loans) — deducted automatically via PAYE if employed, or via Self Assessment if self-employed.' },
    { q: 'Should I overpay my student loan?', a: 'For many graduates, especially on Plan 2 or 5 with large balances that write off after 30-40 years, voluntary overpayment is not always the best use of surplus cash — compare against pension contributions or high-interest debt first, or seek independent financial advice.' },
    { q: 'Can I have two student loan repayments at once?', a: 'Yes — if you have an undergraduate plan and a Postgraduate Loan, both are repaid simultaneously from separate thresholds, so a higher earner could pay 9%+6%=15% combined above the higher of the two thresholds.' }
  ]
});

// 6. Redundancy pay calculator
PAGES.push({
  slug: 'redundancy-pay-calculator',
  title: 'Redundancy Pay Calculator',
  metaTitle: 'Redundancy Pay Calculator UK 2026/27 — Statutory Entitlement',
  metaDesc: 'Free statutory redundancy pay calculator. Enter age, service and weekly pay → instant estimate. 2026/27 £751 weekly cap.',
  h1: 'Redundancy Pay Calculator',
  intro: 'Estimate your statutory redundancy entitlement based on age, length of service and weekly pay.',
  avatarInitials: 'RP',
  ctaSnippet: CTA_FINANCIAL_ADVICE,
  toolHtml: `
  <div class="two-col">
    <div class="input-group"><label>Age</label><input type="number" id="age" min="16" max="80" value="45"></div>
    <div class="input-group"><label>Complete Years of Service</label><input type="number" id="years" min="0" max="40" value="8"></div>
  </div>
  <div class="input-group"><label>Weekly Gross Pay (£)</label><div class="hint">Capped at £751/week (Great Britain) for this calculation</div><input type="number" id="weeklyPay" min="0" step="10" value="600"></div>
  <button class="btn" onclick="calculate()">Calculate Redundancy Pay →</button>
  <div class="results" id="results">
    <div class="result-hero"><div class="value" id="r-total">—</div><div class="label">Estimated Statutory Redundancy Pay</div></div>
    <div class="band-breakdown">
      <div><span>Capped weekly pay used</span><span id="r-cappedpay">—</span></div>
      <div><span>Weeks awarded</span><span id="r-weeks">—</span></div>
    </div>
  </div>`,
  toolJs: `
const CAP=751;
function calculate(){
  const age=parseInt(document.getElementById('age').value)||0;
  let years=Math.min(20,parseInt(document.getElementById('years').value)||0);
  const weeklyPay=Math.min(CAP,parseFloat(document.getElementById('weeklyPay').value)||0);
  let weeks=0;
  for(let i=0;i<years;i++){
    const yearAge=age-years+i+1;
    if (yearAge<22) weeks+=0.5; else if (yearAge<41) weeks+=1; else weeks+=1.5;
  }
  const total=weeks*weeklyPay;
  document.getElementById('r-total').textContent=fmt(total);
  document.getElementById('r-cappedpay').textContent=fmt(weeklyPay);
  document.getElementById('r-weeks').textContent=weeks.toFixed(1)+' weeks';
  document.getElementById('results').classList.add('show');
}`,
  extraContent: `
  <h2>Statutory Redundancy Pay Rules 2026/27</h2>
  <div class="table-wrap"><table><tr><th>Age Band</th><th>Weeks Per Year of Service</th></tr>
  <tr><td>Under 22</td><td>0.5 weeks</td></tr>
  <tr><td>22–40</td><td>1 week</td></tr>
  <tr><td>41 and over</td><td>1.5 weeks</td></tr>
  </table></div>
  <p>Weekly pay is capped at £751 (Great Britain) or £783 (Northern Ireland) regardless of actual earnings, and only the most recent 20 years of service count. Maximum statutory redundancy pay is £22,530 (GB).</p>
  <p>You need at least 2 years' continuous service to qualify for statutory redundancy pay. Some employers offer enhanced (contractual) redundancy pay above the statutory minimum.</p>`,
  faqs: [
    { q: 'How is statutory redundancy pay calculated?', a: 'It\'s based on age, length of service (capped at 20 years) and weekly pay (capped at £751 in Great Britain for 2026/27): 0.5 weeks\' pay per year under 22, 1 week per year aged 22–40, and 1.5 weeks per year aged 41+.' },
    { q: 'What is the maximum statutory redundancy pay?', a: 'For 2026/27, the maximum is £22,530 in Great Britain (20 years × 1.5 weeks × £751 cap), or higher in Northern Ireland using its own £783 weekly cap.' },
    { q: 'Do I qualify for statutory redundancy pay?', a: 'You generally need at least 2 years of continuous service with your employer to qualify, and must be an employee (not self-employed or a contractor) made genuinely redundant.' },
    { q: 'Is redundancy pay taxed?', a: 'The first £30,000 of redundancy pay (statutory and any enhanced contractual amount combined) is usually tax-free; amounts above £30,000 are subject to Income Tax (but not National Insurance).' }
  ]
});

// 7. Maternity pay calculator
PAGES.push({
  slug: 'maternity-pay-calculator',
  title: 'Maternity Pay Calculator',
  metaTitle: 'Maternity Pay Calculator UK 2026/27 — SMP Week by Week',
  metaDesc: 'Free Statutory Maternity Pay calculator. Enter average weekly earnings → instant week-by-week SMP breakdown. 2026/27 £194.32 rate.',
  h1: 'Maternity Pay Calculator',
  intro: 'See your Statutory Maternity Pay week by week — 90% of earnings for the first 6 weeks, then the standard rate.',
  avatarInitials: 'MP',
  ctaSnippet: CTA_FINANCIAL_ADVICE,
  toolHtml: `
  <div class="input-group"><label>Average Weekly Earnings, before leave (£)</label><div class="hint">Based on your 8-week average pay before the qualifying week</div><input type="number" id="awe" min="0" step="10" value="500"></div>
  <button class="btn" onclick="calculate()">Calculate Maternity Pay →</button>
  <div class="results" id="results">
    <div class="result-hero"><div class="value" id="r-total">—</div><div class="label">Total SMP Over 39 Weeks</div></div>
    <div class="band-breakdown">
      <div><span>Weeks 1–6 (90% AWE)</span><span id="r-first6">—</span></div>
      <div><span>Weeks 7–39 (lower of £194.32/90% AWE)</span><span id="r-rest">—</span></div>
      <div><span>Weekly rate, weeks 7–39</span><span id="r-weeklyRate">—</span></div>
    </div>
  </div>`,
  toolJs: `
const SMP_FLAT=194.32;
function calculate(){
  const awe=parseFloat(document.getElementById('awe').value)||0;
  const first6Weekly=awe*0.90;
  const restWeekly=Math.min(SMP_FLAT,awe*0.90);
  const first6=first6Weekly*6;
  const rest=restWeekly*33;
  document.getElementById('r-total').textContent=fmt(first6+rest);
  document.getElementById('r-first6').textContent=fmt(first6);
  document.getElementById('r-rest').textContent=fmt(rest);
  document.getElementById('r-weeklyRate').textContent=fmt(restWeekly);
  document.getElementById('results').classList.add('show');
}`,
  extraContent: `
  <h2>Statutory Maternity Pay 2026/27</h2>
  <div class="table-wrap"><table><tr><th>Period</th><th>Rate</th></tr>
  <tr><td>Weeks 1–6</td><td>90% of average weekly earnings (uncapped)</td></tr>
  <tr><td>Weeks 7–39</td><td>Lower of £194.32/week or 90% of average weekly earnings</td></tr>
  <tr><td>Weeks 40–52</td><td>Unpaid (unless employer offers enhanced maternity pay)</td></tr>
  </table></div>
  <p>To qualify, you need at least 26 weeks' continuous service by the "qualifying week" (15 weeks before the due date) and average earnings at or above the Lower Earnings Limit (£129/week). Many employers offer enhanced contractual maternity pay above the statutory minimum — check your contract.</p>`,
  faqs: [
    { q: 'How much is Statutory Maternity Pay in 2026/27?', a: '90% of your average weekly earnings for the first 6 weeks, then the lower of £194.32/week or 90% of average weekly earnings for the remaining 33 weeks, paid for up to 39 weeks total.' },
    { q: 'Do I qualify for Statutory Maternity Pay?', a: 'You need at least 26 weeks\' continuous employment with your employer by the qualifying week (15 weeks before your due date), and average weekly earnings of at least £129 (the Lower Earnings Limit).' },
    { q: 'Is maternity leave 52 weeks but pay only 39 weeks?', a: 'Yes — statutory maternity leave is up to 52 weeks, but Statutory Maternity Pay is only paid for the first 39 weeks; the final 13 weeks are unpaid unless your employer offers enhanced pay.' },
    { q: 'What if I don\'t qualify for SMP?', a: 'You may be able to claim Maternity Allowance instead, paid by the DWP rather than your employer — check eligibility at gov.uk/maternity-allowance.' }
  ]
});

// 8. Pension contribution calculator
PAGES.push({
  slug: 'pension-contribution-calculator',
  title: 'Pension Contribution Calculator',
  metaTitle: 'Pension Contribution Calculator UK 2026/27 — Auto-Enrolment',
  metaDesc: 'Free pension contribution calculator. Enter salary and contribution % → instant annual contribution and tax relief. Auto-enrolment 2026/27.',
  h1: 'Pension Contribution Calculator',
  intro: 'See your annual pension contribution, tax relief and the impact on take-home pay.',
  avatarInitials: 'PC',
  ctaSnippet: CTA_FINANCIAL_ADVICE,
  toolHtml: `
  <div class="two-col">
    <div class="input-group"><label>Annual Gross Salary (£)</label><input type="number" id="salary" min="0" step="500" value="35000"></div>
    <div class="input-group"><label>Your Contribution (%)</label><input type="number" id="employeePct" min="0" max="100" step="0.5" value="5"></div>
  </div>
  <div class="input-group"><label>Employer Contribution (%)</label><input type="number" id="employerPct" min="0" max="100" step="0.5" value="3"></div>
  <button class="btn" onclick="calculate()">Calculate Contribution →</button>
  <div class="results" id="results">
    <div class="result-hero"><div class="value" id="r-total">—</div><div class="label">Total Annual Pension Contribution</div></div>
    <div class="band-breakdown">
      <div><span>Your contribution</span><span id="r-employee">—</span></div>
      <div><span>Employer contribution</span><span id="r-employer">—</span></div>
      <div><span>Approx. tax relief on your contribution</span><span id="r-relief">—</span></div>
      <div><span>Net cost to your take-home pay</span><span id="r-netcost">—</span></div>
    </div>
  </div>`,
  toolJs: `
function personalAllowance(income){ if(income<=100000) return 12570; return Math.max(0,12570-(income-100000)/2); }
function marginalRate(income){
  const pa=personalAllowance(income);
  if (income<=pa) return 0;
  if (income<=50270) return 0.20;
  if (income<=125140) return 0.40;
  return 0.45;
}
function calculate(){
  const gross=parseFloat(document.getElementById('salary').value)||0;
  const empPct=parseFloat(document.getElementById('employeePct').value)||0;
  const erPct=parseFloat(document.getElementById('employerPct').value)||0;
  const employee=gross*(empPct/100);
  const employer=gross*(erPct/100);
  const rate=marginalRate(gross);
  const relief=employee*rate;
  const netCost=employee-relief;
  document.getElementById('r-total').textContent=fmt(employee+employer);
  document.getElementById('r-employee').textContent=fmt(employee);
  document.getElementById('r-employer').textContent=fmt(employer);
  document.getElementById('r-relief').textContent=fmt(relief);
  document.getElementById('r-netcost').textContent=fmt(netCost);
  document.getElementById('results').classList.add('show');
}`,
  extraContent: `
  <h2>Auto-Enrolment Pension Rules 2026/27</h2>
  <div class="table-wrap"><table><tr><th>Rule</th><th>Value</th></tr>
  <tr><td>Qualifying earnings band</td><td>£6,240 – £50,270</td></tr>
  <tr><td>Earnings trigger for auto-enrolment</td><td>£10,000/year</td></tr>
  <tr><td>Minimum total contribution</td><td>8% of qualifying earnings</td></tr>
  <tr><td>Typical split</td><td>5% employee / 3% employer</td></tr>
  </table></div>
  <p>Under a "net pay arrangement" (the most common workplace pension setup), your contribution is deducted before tax, so you automatically get tax relief at your marginal rate — a higher-rate taxpayer effectively pays less out of pocket for the same pension contribution.</p>`,
  faqs: [
    { q: 'What is the minimum pension contribution under auto-enrolment?', a: '8% of qualifying earnings (between £6,240 and £50,270) in total, typically split as 5% from the employee and 3% from the employer, though the split can vary as long as the employer pays at least 3%.' },
    { q: 'How does pension tax relief work?', a: 'Under a net pay arrangement, your contribution is deducted from salary before Income Tax is calculated, so you automatically get relief at your marginal rate (20%, 40% or 45%) — a £100 contribution costs a higher-rate taxpayer only £60 out of take-home pay.' },
    { q: 'Can I contribute more than the auto-enrolment minimum?', a: 'Yes — many people increase contributions, especially higher earners using salary sacrifice to also reduce National Insurance, or to make use of the higher-rate tax relief before hitting the £60,000 annual allowance.' },
    { q: 'What is salary sacrifice?', a: 'An arrangement where you give up part of your salary in exchange for an equivalent employer pension contribution — this can also reduce your National Insurance bill, not just Income Tax, making it more tax-efficient than a standard net pay contribution.' }
  ]
});

// 9. Required salary calculator — reverse: target net take-home → gross needed
PAGES.push({
  slug: 'required-salary-calculator',
  title: 'Required Salary Calculator',
  metaTitle: 'Required Salary Calculator UK 2026/27 — Gross Needed for Target Take-Home',
  metaDesc: 'Free required salary calculator. Enter the take-home pay you want → instant gross salary needed after tax, NI, student loan and pension. 2026/27 rates.',
  h1: 'Required Salary Calculator',
  intro: 'Work backwards from the take-home pay you want to the gross salary you need to ask for.',
  avatarInitials: 'RS',
  ctaSnippet: CTA_FINANCIAL_ADVICE,
  toolHtml: `
  <div class="input-group period-seg"><label>Target Take-Home Pay Is</label>
    <div class="seg-row" id="periodSeg">
      <div class="seg-btn active" data-val="annual">Per Year</div>
      <div class="seg-btn" data-val="monthly">Per Month</div>
    </div>
  </div>
  <div class="input-group"><label id="targetLabel">Target Annual Take-Home Pay (£)</label><input type="number" id="target" min="0" step="100" value="30000"></div>
  <div class="input-group"><label>Region</label>
    <div class="seg-row" id="regionSeg">
      <div class="seg-btn active" data-val="rest_uk">England / Wales / NI</div>
      <div class="seg-btn" data-val="scotland">Scotland</div>
    </div>
  </div>
  <div class="two-col">
    <div class="input-group"><label>Pension Contribution (%)</label><input type="number" id="pension" min="0" max="100" step="0.5" value="0"></div>
    <div class="input-group"><label>Student Loan Plan</label>
      <select id="loanPlan">
        <option value="none" selected>None</option>
        <option value="plan1">Plan 1</option>
        <option value="plan2">Plan 2</option>
        <option value="plan4">Plan 4 (Scotland)</option>
        <option value="plan5">Plan 5</option>
        <option value="postgrad">Postgraduate Loan</option>
      </select>
    </div>
  </div>
  <button class="btn" onclick="calculate()">Calculate Required Salary →</button>
  <div class="results" id="results">
    <div class="result-hero"><div class="value" id="r-gross">—</div><div class="label">Gross Annual Salary Needed</div></div>
    <div class="band-breakdown">
      <div><span>Income Tax</span><span id="r-it">—</span></div>
      <div><span>National Insurance</span><span id="r-ni">—</span></div>
      <div><span>Student Loan</span><span id="r-sl">—</span></div>
      <div><span>Pension</span><span id="r-pen">—</span></div>
      <div><span>Take-Home Pay (check)</span><span id="r-check">—</span></div>
    </div>
  </div>`,
  toolJs: `
const PT=12570, UEL=50270;
const LOAN_PLANS={none:null,plan1:{t:26900,r:0.09},plan2:{t:29385,r:0.09},plan4:{t:33795,r:0.09},plan5:{t:25000,r:0.09},postgrad:{t:21000,r:0.06}};
function personalAllowance(income){ if(income<=100000) return 12570; return Math.max(0,12570-(income-100000)/2); }
function incomeTax(taxable, region){
  const pa = personalAllowance(taxable);
  if (region==='scotland') return bandedTax(taxable,[[0,pa,0],[pa,16537,0.19],[16537,29526,0.20],[29526,43662,0.21],[43662,75000,0.42],[75000,125140,0.45],[125140,Infinity,0.48]]);
  return bandedTax(taxable,[[0,pa,0],[pa,50270,0.20],[50270,125140,0.40],[125140,Infinity,0.45]]);
}
function nationalInsurance(gross){ return bandedTax(gross,[[0,PT,0],[PT,UEL,0.08],[UEL,Infinity,0.02]]); }
function studentLoan(gross, plan){ const p=LOAN_PLANS[plan]; if(!p) return 0; return Math.max(0,gross-p.t)*p.r; }
function netFromGross(gross, region, pensionPct, plan){
  const pensionAmt = gross*(pensionPct/100);
  const taxable = Math.max(0, gross-pensionAmt);
  const it = incomeTax(taxable, region);
  const ni = nationalInsurance(gross);
  const sl = studentLoan(gross, plan);
  return { net: gross-it-ni-sl-pensionAmt, it, ni, sl, pensionAmt };
}
document.querySelectorAll('#regionSeg .seg-btn').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('#regionSeg .seg-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');}));
document.querySelectorAll('#periodSeg .seg-btn').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('#periodSeg .seg-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');
  document.getElementById('targetLabel').textContent = b.dataset.val==='monthly' ? 'Target Monthly Take-Home Pay (£)' : 'Target Annual Take-Home Pay (£)';
}));
function calculate(){
  const period=document.querySelector('#periodSeg .seg-btn.active').dataset.val;
  const targetInput=parseFloat(document.getElementById('target').value)||0;
  const targetAnnual = period==='monthly' ? targetInput*12 : targetInput;
  const region=document.querySelector('#regionSeg .seg-btn.active').dataset.val==='scotland'?'scotland':'rest_uk';
  const pensionPct=parseFloat(document.getElementById('pension').value)||0;
  const plan=document.getElementById('loanPlan').value;
  let lo=targetAnnual, hi=Math.max(targetAnnual*3,50000), mid=targetAnnual;
  for(let i=0;i<60;i++){
    mid=(lo+hi)/2;
    const net=netFromGross(mid,region,pensionPct,plan).net;
    if (net<targetAnnual) lo=mid; else hi=mid;
  }
  const result=netFromGross(mid,region,pensionPct,plan);
  document.getElementById('r-gross').textContent=fmt(mid);
  document.getElementById('r-it').textContent=fmt(result.it);
  document.getElementById('r-ni').textContent=fmt(result.ni);
  document.getElementById('r-sl').textContent=fmt(result.sl);
  document.getElementById('r-pen').textContent=fmt(result.pensionAmt);
  document.getElementById('r-check').textContent=fmt(result.net);
  document.getElementById('results').classList.add('show');
}`,
  extraContent: `
  <h2>Why Work Backwards From Take-Home Pay?</h2>
  <p>Job adverts and salary negotiations are almost always framed in gross salary, but what actually matters to your budget is what lands in your bank account. This calculator inverts the usual maths — tell it the monthly or annual take-home you need, and it works out the gross salary to ask for, accounting for Income Tax, National Insurance, your region, pension contributions and any student loan.</p>
  <h2>How the Calculation Works</h2>
  <p>Because Income Tax and National Insurance are banded (not a single flat rate), there's no simple formula to reverse — this tool searches for the exact gross salary whose take-home pay matches your target, using the same deterministic bands as the main <a href="/">take-home pay calculator</a>.</p>
  <p>Useful for salary negotiations, evaluating a job offer against your current take-home, or setting a minimum acceptable rate when freelancing or contracting.</p>`,
  faqs: [
    { q: 'How does a required salary calculator work?', a: 'It works backwards from your desired net (take-home) pay to find the gross salary that produces it, accounting for Income Tax, National Insurance, pension and student loan deductions — the reverse of a normal take-home pay calculation.' },
    { q: 'Why can\'t required salary be calculated with a simple formula?', a: 'UK Income Tax and National Insurance are charged in bands at different rates, and the Personal Allowance itself shrinks above £100,000 income — so the relationship between gross and net pay isn\'t a straight line, and reversing it needs iterative calculation rather than one formula.' },
    { q: 'Should I use monthly or annual take-home pay to negotiate?', a: 'Either works — this calculator accepts both and converts internally. Many people find it easier to think in monthly take-home pay since that matches how bills and budgets are usually planned.' },
    { q: 'Does this account for pension and student loan?', a: 'Yes — both are optional inputs. Pension contributions reduce your taxable income (net pay arrangement) and increase the gross salary needed; student loan repayments come directly off gross pay above your plan\'s threshold.' }
  ]
});

// 10. Compare two salaries calculator — side-by-side job offer comparison
PAGES.push({
  slug: 'compare-two-salaries-calculator',
  title: 'Compare Two Salaries Calculator',
  metaTitle: 'Compare Two Salaries UK 2026/27 — Job Offer Take-Home Pay',
  metaDesc: 'Free tool to compare two salaries or job offers side by side. Instant take-home pay difference after tax, NI, student loan and pension. 2026/27 rates.',
  h1: 'Compare Two Salaries',
  intro: 'Comparing two job offers or a pay rise? See the real take-home pay difference, side by side.',
  avatarInitials: 'CM',
  ctaSnippet: CTA_FINANCIAL_ADVICE,
  toolHtml: `
  <div class="compare-grid">
    <div class="offer-card">
      <h3>Offer A</h3>
      <div class="input-group"><label>Annual Gross Salary (£)</label><input type="number" id="salaryA" min="0" step="500" value="35000"></div>
      <div class="input-group"><label>Region</label>
        <select id="regionA"><option value="rest_uk" selected>England / Wales / NI</option><option value="scotland">Scotland</option></select>
      </div>
      <div class="input-group"><label>Pension (%)</label><input type="number" id="pensionA" min="0" max="100" step="0.5" value="0"></div>
      <div class="input-group"><label>Student Loan</label>
        <select id="loanA"><option value="none" selected>None</option><option value="plan1">Plan 1</option><option value="plan2">Plan 2</option><option value="plan4">Plan 4 (Scotland)</option><option value="plan5">Plan 5</option><option value="postgrad">Postgraduate</option></select>
      </div>
    </div>
    <div class="offer-card">
      <h3>Offer B</h3>
      <div class="input-group"><label>Annual Gross Salary (£)</label><input type="number" id="salaryB" min="0" step="500" value="40000"></div>
      <div class="input-group"><label>Region</label>
        <select id="regionB"><option value="rest_uk" selected>England / Wales / NI</option><option value="scotland">Scotland</option></select>
      </div>
      <div class="input-group"><label>Pension (%)</label><input type="number" id="pensionB" min="0" max="100" step="0.5" value="0"></div>
      <div class="input-group"><label>Student Loan</label>
        <select id="loanB"><option value="none" selected>None</option><option value="plan1">Plan 1</option><option value="plan2">Plan 2</option><option value="plan4">Plan 4 (Scotland)</option><option value="plan5">Plan 5</option><option value="postgrad">Postgraduate</option></select>
      </div>
    </div>
  </div>
  <button class="btn" onclick="calculate()">Compare Take-Home Pay →</button>
  <div class="results" id="results">
    <div class="result-hero"><div class="value" id="r-diff">—</div><div class="label">Take-Home Pay Difference, Per Year</div></div>
    <div class="compare-grid">
      <div class="offer-card">
        <div class="compare-result-row"><span>Gross</span><span id="a-gross">—</span></div>
        <div class="compare-result-row"><span>Income Tax</span><span id="a-it">—</span></div>
        <div class="compare-result-row"><span>National Insurance</span><span id="a-ni">—</span></div>
        <div class="compare-result-row"><span>Take-Home / Year <span id="a-badge"></span></span><span id="a-net">—</span></div>
        <div class="compare-result-row"><span>Take-Home / Month</span><span id="a-netmonth">—</span></div>
      </div>
      <div class="offer-card">
        <div class="compare-result-row"><span>Gross</span><span id="b-gross">—</span></div>
        <div class="compare-result-row"><span>Income Tax</span><span id="b-it">—</span></div>
        <div class="compare-result-row"><span>National Insurance</span><span id="b-ni">—</span></div>
        <div class="compare-result-row"><span>Take-Home / Year <span id="b-badge"></span></span><span id="b-net">—</span></div>
        <div class="compare-result-row"><span>Take-Home / Month</span><span id="b-netmonth">—</span></div>
      </div>
    </div>
  </div>`,
  toolJs: `
const PT=12570, UEL=50270;
const LOAN_PLANS={none:null,plan1:{t:26900,r:0.09},plan2:{t:29385,r:0.09},plan4:{t:33795,r:0.09},plan5:{t:25000,r:0.09},postgrad:{t:21000,r:0.06}};
function personalAllowance(income){ if(income<=100000) return 12570; return Math.max(0,12570-(income-100000)/2); }
function incomeTax(taxable, region){
  const pa = personalAllowance(taxable);
  if (region==='scotland') return bandedTax(taxable,[[0,pa,0],[pa,16537,0.19],[16537,29526,0.20],[29526,43662,0.21],[43662,75000,0.42],[75000,125140,0.45],[125140,Infinity,0.48]]);
  return bandedTax(taxable,[[0,pa,0],[pa,50270,0.20],[50270,125140,0.40],[125140,Infinity,0.45]]);
}
function studentLoan(gross, plan){ const p=LOAN_PLANS[plan]; if(!p) return 0; return Math.max(0,gross-p.t)*p.r; }
function offerResult(prefix){
  const gross=parseFloat(document.getElementById('salary'+prefix).value)||0;
  const region=document.getElementById('region'+prefix).value;
  const pensionPct=parseFloat(document.getElementById('pension'+prefix).value)||0;
  const plan=document.getElementById('loan'+prefix).value;
  const pensionAmt=gross*(pensionPct/100);
  const taxable=Math.max(0,gross-pensionAmt);
  const it=incomeTax(taxable,region);
  const ni=bandedTax(gross,[[0,PT,0],[PT,UEL,0.08],[UEL,Infinity,0.02]]);
  const sl=studentLoan(gross,plan);
  const net=gross-it-ni-sl-pensionAmt;
  return { gross, it, ni, net };
}
function calculate(){
  const a=offerResult('A'), b=offerResult('B');
  document.getElementById('a-gross').textContent=fmt(a.gross);
  document.getElementById('a-it').textContent=fmt(a.it);
  document.getElementById('a-ni').textContent=fmt(a.ni);
  document.getElementById('a-net').textContent=fmt(a.net);
  document.getElementById('a-netmonth').textContent=fmt(a.net/12);
  document.getElementById('b-gross').textContent=fmt(b.gross);
  document.getElementById('b-it').textContent=fmt(b.it);
  document.getElementById('b-ni').textContent=fmt(b.ni);
  document.getElementById('b-net').textContent=fmt(b.net);
  document.getElementById('b-netmonth').textContent=fmt(b.net/12);
  document.getElementById('a-badge').innerHTML = a.net>b.net ? '<span class=\\"winner-badge\\">HIGHER</span>' : '';
  document.getElementById('b-badge').innerHTML = b.net>a.net ? '<span class=\\"winner-badge\\">HIGHER</span>' : '';
  const diff=Math.abs(a.net-b.net);
  document.getElementById('r-diff').textContent=fmt(diff);
  document.getElementById('results').classList.add('show');
}`,
  extraContent: `
  <h2>Why Compare Take-Home Pay, Not Just Gross Salary</h2>
  <p>A £5,000 gross pay rise rarely means £5,000 more in your pocket — moving into a higher tax band, losing Personal Allowance above £100,000, or a different region's Income Tax bands (Scotland vs the rest of the UK) can all shrink the real-world gain. Comparing two offers on take-home pay, not headline salary, shows what actually changes for your budget.</p>
  <h2>What to Check Beyond the Numbers</h2>
  <ul>
    <li><strong>Pension match:</strong> a lower salary with a stronger employer pension match can still be worth more overall.</li>
    <li><strong>Benefits in kind:</strong> private healthcare, company car or bonus schemes aren't captured here — factor them in separately.</li>
    <li><strong>Location:</strong> if one offer is in Scotland, its Income Tax bands differ from the rest of the UK even at an identical salary.</li>
  </ul>`,
  faqs: [
    { q: 'Why is my pay rise not worth as much as I expected?', a: 'Because Income Tax and National Insurance are banded, part of a pay rise can be taxed at a higher marginal rate than your existing salary — and above £100,000 you also start losing Personal Allowance at 60% effective marginal rate. Comparing take-home pay (not gross) shows the real gain.' },
    { q: 'How do I compare a Scotland-based job offer to an England-based one?', a: 'Enter each offer with its correct region — Scotland uses six Income Tax bands (19–48%) instead of the rest of the UK\'s three (20/40/45%), so identical gross salaries can produce different take-home pay depending on region.' },
    { q: 'Does this include pension and student loan in the comparison?', a: 'Yes — both are optional per-offer inputs, since employer pension schemes and student loan status vary between jobs and materially affect the real take-home difference.' },
    { q: 'What should I check beyond take-home pay when comparing offers?', a: 'Employer pension contribution match, private healthcare or other benefits in kind, bonus structure, and cost of commuting or relocating — none of which are captured by a salary-only comparison.' }
  ]
});

// ============ BUILD ============

for (const p of PAGES) {
  const dir = path.join(__dirname, p.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), pageShell(p));
  console.log('Wrote', p.slug + '/index.html');
}

const urls = [`${SITE_URL}/`, ...PAGES.map(p => `${SITE_URL}/${p.slug}/`)];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(u => `  <url><loc>${u}</loc><changefreq>monthly</changefreq><priority>${u === SITE_URL + '/' ? '1.0' : '0.8'}</priority></url>`).join('\n') +
  `\n</urlset>\n`;
fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), sitemap);
console.log('Wrote sitemap.xml with', urls.length, 'URLs');
