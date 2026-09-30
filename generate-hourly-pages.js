// Generates the hourly-to-salary-calculator hub (hourly<->annual + pro-rata dual-mode tool)
// plus £X-per-hour-annual-salary/ tranche pages + sitemap-hourly.xml.
// Engine mirrors index.html / generate-pages.js / generate-tranche-pages.js — keep in sync if rates change.
const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://mynetsalary.co.uk';
const GSC_TAG = 'F0g9xdQ9RU5cTssBiWtkj41-7q2_kIwcKbJc_sMTthQ';

// National Living Wage 2026/27 (from 1 April 2026), gov.uk press release
// "National Living Wage increases to £12.71 per hour" — verified against primary source.
const NLW_21_PLUS = 12.71;
const NMW_18_20 = 10.85;
const NMW_16_17_APPRENTICE = 8.00;

const PT = 12570, UEL = 50270;
const STANDARD_HOURS_WEEK = 37.5; // site-wide convention (see generate-tranche-pages.js "Hourly (37.5h week)")
const FULL_TIME_HOURS_WEEK = 40;  // common alternative full-time definition, shown for comparison
const WEEKS_YEAR = 52;

function bandedTax(income, bands) {
  let tax = 0;
  for (const [lo, hi, rate] of bands) { if (income > lo) tax += (Math.min(income, hi) - lo) * rate; }
  return tax;
}
function personalAllowance(income) { if (income <= 100000) return 12570; return Math.max(0, 12570 - (income - 100000) / 2); }
function incomeTax(taxable) {
  const pa = personalAllowance(taxable);
  return bandedTax(taxable, [[0, pa, 0], [pa, 50270, 0.20], [50270, 125140, 0.40], [125140, Infinity, 0.45]]);
}
function nationalInsurance(gross) { return bandedTax(gross, [[0, PT, 0], [PT, UEL, 0.08], [UEL, Infinity, 0.02]]); }

function breakdown(gross) {
  const it = incomeTax(gross);
  const ni = nationalInsurance(gross);
  const net = gross - it - ni;
  return { gross, it, ni, net, monthly: net / 12, weekly: net / 52 };
}

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
  h1 { font-size: clamp(1.5rem, 4vw, 2.3rem); font-weight: 800; letter-spacing: -0.5px; }
  .flag { font-size: 0.85rem; background: rgba(255,255,255,0.15); border-radius: 20px; padding: 4px 14px; display: inline-block; margin-bottom: 16px; letter-spacing: 1px; }
  .tool-card { background: white; border-radius: var(--radius); box-shadow: 0 4px 32px rgba(0,0,0,0.10); margin: -48px auto 40px; max-width: 720px; padding: 36px 32px; position: relative; z-index: 10; }
  .input-group { margin-bottom: 20px; }
  .input-group label { display: block; font-weight: 600; font-size: 0.9rem; margin-bottom: 6px; color: var(--text); }
  .input-group .hint { font-size: 0.78rem; color: var(--muted); margin-bottom: 8px; }
  input[type="number"] { width: 100%; padding: 10px 14px; border: 1.5px solid var(--border); border-radius: 8px; font-size: 1rem; background: white; }
  input[type="number"]:focus { outline: none; border-color: var(--brand); }
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
  .nearby-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 10px; margin: 16px 0 40px; }
  .nearby-link { display: block; background: white; border: 1.5px solid var(--border); border-radius: 8px; padding: 10px; text-align: center; text-decoration: none; color: var(--text); font-weight: 700; font-size: 0.88rem; transition: border-color .15s; }
  .nearby-link:hover { border-color: var(--brand); }
  .nearby-link.current { background: var(--brand); color: white; border-color: var(--brand); }
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
`;

const CTA_PAYROLL_SOFTWARE = `
<div class="cta-box">
  <h2>Running Payroll for Your Business?</h2>
  <p>This calculator is built for individuals checking their own numbers. If you're running payroll for a team, a dedicated platform automates this calculation for every employee, every pay run.</p>
  <ul>
    <li><strong>Small business, first hire:</strong> set up PAYE and auto-enrolment correctly from day one.</li>
    <li><strong>Growing team:</strong> automate payslips, RTI submissions and pension contributions.</li>
  </ul>
  <p>Cloud payroll platforms like Xero, QuickBooks and BrightPay handle Income Tax, NI, student loan and pension deductions automatically.</p>
  <a href="#" class="cta-btn" target="_blank" rel="noopener">Compare Payroll Software →</a>
</div>`;

function fmt(n) { return '£' + Math.round(n).toLocaleString('en-GB'); }
function fmt2(n) { return '£' + n.toFixed(2); }

function faqHtml(faqs) {
  return `<div class="faq"><h2>Frequently Asked Questions</h2>` +
    faqs.map(f => `<div class="faq-item"><div class="faq-q" onclick="toggleFaq(this)">${f.q}</div><div class="faq-a">${f.a}</div></div>`).join('\n') +
    `</div>`;
}
function faqJsonLd(faqs) {
  return faqs.map(f => ({ "@type": "Question", "name": f.q, "acceptedAnswer": { "@type": "Answer", "text": f.a.replace(/<[^>]+>/g, '') } }));
}

function eeatSection(pageTitle) {
  return `
  <div class="eeat-section">
    <h2 class="eeat-title">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>
      Transparency &amp; Methodology
    </h2>
    <div class="eeat-grid">
      <div class="eeat-author-card">
        <div class="eeat-avatar">£</div>
        <div class="eeat-author-info">
          <h3>${pageTitle}</h3>
          <div class="eeat-author-subtitle">Independent, Open-Source Estimator</div>
          <p>An independent calculator applying published HMRC rates and Low Pay Commission minimum wage rates deterministically — no AI estimate, no official affiliation.</p>
        </div>
      </div>
      <div class="eeat-compliance">
        <div class="eeat-compliance-item">
          <svg class="eeat-compliance-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
          <div class="eeat-compliance-text"><h4>Methodology &amp; Sources</h4><p>Figures use published HMRC Income Tax/NI rates (2026/27) and the gov.uk National Living Wage rate effective 1 April 2026. For your exact position, use <a href="https://www.gov.uk/estimate-income-tax" target="_blank" rel="noopener">gov.uk/estimate-income-tax</a>.</p></div>
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

function satGrid() {
  return `
  <a class="sat-link" href="/"><div class="t">Take-Home Pay Calculator</div><div class="d">Full salary breakdown, any amount</div></a>
  <a class="sat-link" href="/required-salary-calculator/"><div class="t">Required Salary Calculator</div><div class="d">Gross salary needed for a target take-home</div></a>
  <a class="sat-link" href="/compare-two-salaries-calculator/"><div class="t">Compare Two Salaries</div><div class="d">Job offer take-home pay, side by side</div></a>
  <a class="sat-link" href="/salary-after-tax/"><div class="t">Salary After Tax — Browse by Amount</div><div class="d">£15,000 to £150,000, pick your salary</div></a>`;
}

function pageHead(metaTitle, metaDesc, canonical, jsonLd) {
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
${JSON.stringify(jsonLd, null, 2)}
</script>

<style>${CSS}</style>
</head>
<body>`;
}

// ============ HOURLY RATE TRANCHES ============
// Round hourly rates + the 2026/27 National Living/Minimum Wage rates, £1 steps £8-£30
// (where most searches cluster), wider steps above (contractor/day-rate territory).
const HOURLY_RATES = [
  8, NMW_18_20, 11, 12, NLW_21_PLUS, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
  32, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 90, 100
].filter((v, i, arr) => arr.indexOf(v) === i).sort((a, b) => a - b);

function slugFor(rate) { return `${String(rate).replace('.', '-')}-per-hour-annual-salary`; }

function tierContext(rate) {
  if (rate <= NLW_21_PLUS) {
    return `At ${fmt2(rate)} an hour, this sits at or near the National Living Wage (£${NLW_21_PLUS.toFixed(2)} for ages 21+ from 1 April 2026) — typical for entry-level retail, hospitality and care roles.`;
  }
  if (rate <= 20) {
    return `${fmt2(rate)} an hour is a common rate for experienced retail, hospitality, admin and customer service roles above minimum wage.`;
  }
  if (rate <= 35) {
    return `${fmt2(rate)} an hour is typical for skilled trades, teaching assistants, junior professional and technical roles.`;
  }
  if (rate <= 60) {
    return `${fmt2(rate)} an hour is typical for experienced professional, healthcare (senior NHS bands) and mid-level management roles.`;
  }
  return `${fmt2(rate)} an hour is typical day-rate territory for contractors, interim managers and senior consultants — at this level, check whether IR35 applies if you contract via a limited company.`;
}

function pageHtml(rate) {
  const grossStd = rate * STANDARD_HOURS_WEEK * WEEKS_YEAR;   // 37.5h/week
  const grossFT = rate * FULL_TIME_HOURS_WEEK * WEEKS_YEAR;   // 40h/week
  const bdStd = breakdown(grossStd);
  const bdFT = breakdown(grossFT);
  const slug = slugFor(rate);
  const canonical = `${SITE_URL}/${slug}/`;
  const rateLabel = fmt2(rate);
  const title = `${rateLabel} an Hour Is How Much a Year?`;
  const metaTitle = `${title} UK Salary & Take-Home 2026/27 | mynetsalary.co.uk`;
  const metaDesc = `${rateLabel} an hour is ${fmt(grossStd)} a year on a 37.5-hour week (${fmt(grossFT)} on 40 hours) — take-home pay ${fmt(bdStd.net)} after Income Tax and NI, 2026/27 rates.`;

  const idx = HOURLY_RATES.indexOf(rate);
  const nearby = [HOURLY_RATES[idx - 2], HOURLY_RATES[idx - 1], rate, HOURLY_RATES[idx + 1], HOURLY_RATES[idx + 2]].filter(n => n !== undefined);
  const nearbyHtml = nearby.map(n => n === rate
    ? `<span class="nearby-link current">£${fmt2(n).slice(1)}/hr</span>`
    : `<a class="nearby-link" href="/${slugFor(n)}/">£${fmt2(n).slice(1)}/hr</a>`
  ).join('\n');

  const vsNlw = rate - NLW_21_PLUS;
  const nlwSentence = Math.abs(vsNlw) < 0.01
    ? `This is exactly the 2026/27 National Living Wage.`
    : vsNlw > 0
      ? `This is ${fmt2(vsNlw)} (${((vsNlw / NLW_21_PLUS) * 100).toFixed(0)}%) above the 2026/27 National Living Wage of ${fmt2(NLW_21_PLUS)}.`
      : `This is below the 2026/27 National Living Wage of ${fmt2(NLW_21_PLUS)} for ages 21+ — check you're being paid correctly for your age band.`;

  const faqs = [
    { q: `How much is ${rateLabel} an hour annually in the UK?`, a: `${rateLabel} an hour is ${fmt(grossStd)} a year on a standard 37.5-hour working week (52 weeks), or ${fmt(grossFT)} a year on a 40-hour week. Take-home pay after Income Tax and National Insurance is ${fmt(bdStd.net)} a year (37.5h) — ${fmt(bdStd.monthly)} a month.` },
    { q: `Is ${rateLabel} an hour good pay in the UK?`, a: nlwSentence + ' ' + tierContext(rate) },
    { q: `Does ${rateLabel} an hour change if I work 40 hours instead of 37.5?`, a: `Yes — at 40 hours a week your gross annual salary is ${fmt(grossFT)} instead of ${fmt(grossStd)}, a difference of ${fmt(grossFT - grossStd)} a year, because you're simply working more paid hours.` },
    { q: `What tax do I pay on ${rateLabel} an hour?`, a: `On the 37.5-hour-week figure of ${fmt(grossStd)}, you'd pay ${fmt(bdStd.it)} Income Tax and ${fmt(bdStd.ni)} National Insurance a year, 2026/27 rates, England/Wales/NI — leaving ${fmt(bdStd.net)} take-home. Scotland uses different Income Tax bands; see the <a href="/scotland-salary-calculator/">Scotland Salary Calculator</a>.` }
  ];

  const toolHtml = `
  <div class="input-group"><label>Hourly Rate</label><input type="number" id="rate" min="0" step="0.01" value="${rate}"></div>
  <div class="two-col">
    <div class="input-group"><label>Hours per Week</label><input type="number" id="hours" min="1" max="80" step="0.5" value="${STANDARD_HOURS_WEEK}"></div>
    <div class="input-group"><label>Paid Weeks per Year</label><input type="number" id="weeks" min="1" max="52" step="1" value="${WEEKS_YEAR}"></div>
  </div>
  <button class="btn" onclick="calculate()">Recalculate →</button>
  <div class="results show" id="results">
    <div class="result-hero"><div class="value" id="r-gross">${fmt(grossStd)}</div><div class="label">Annual Gross Salary</div></div>
    <div class="results-grid">
      <div class="result-box"><div class="label">Monthly Gross</div><div class="value" id="r-grossmonth">${fmt(grossStd / 12)}</div></div>
      <div class="result-box accent"><div class="label">Tax + NI</div><div class="value" id="r-deductions">${fmt(bdStd.it + bdStd.ni)}</div></div>
      <div class="result-box"><div class="label">Take-Home</div><div class="value" id="r-takehome">${fmt(bdStd.net)}</div></div>
    </div>
    <div class="band-breakdown">
      <div><span>Monthly Take-Home</span><span id="r-takehomemonth">${fmt(bdStd.monthly)}</span></div>
      <div><span>Weekly Take-Home</span><span id="r-takehomeweek">${fmt(bdStd.weekly)}</span></div>
    </div>
  </div>`;

  const toolJs = `
function calculate(){
  const rate=parseFloat(document.getElementById('rate').value)||0;
  const hours=parseFloat(document.getElementById('hours').value)||0;
  const weeks=parseFloat(document.getElementById('weeks').value)||52;
  const gross=rate*hours*weeks;
  const pa=(income)=>income<=100000?12570:Math.max(0,12570-(income-100000)/2);
  const p=pa(gross);
  const it=bandedTax(gross,[[0,p,0],[p,50270,0.20],[50270,125140,0.40],[125140,Infinity,0.45]]);
  const ni=bandedTax(gross,[[0,12570,0],[12570,50270,0.08],[50270,Infinity,0.02]]);
  const takeHome=gross-it-ni;
  document.getElementById('r-gross').textContent=fmt(gross);
  document.getElementById('r-grossmonth').textContent=fmt(gross/12);
  document.getElementById('r-deductions').textContent=fmt(it+ni);
  document.getElementById('r-takehome').textContent=fmt(takeHome);
  document.getElementById('r-takehomemonth').textContent=fmt(takeHome/12);
  document.getElementById('r-takehomeweek').textContent=fmt(takeHome/52);
}`;

  const extraContent = `
  <h2>${rateLabel} an Hour — Annual Salary at Different Weekly Hours</h2>
  <div class="table-wrap"><table>
  <tr><th>Weekly Hours</th><th>Annual Gross</th><th>Monthly Gross</th><th>Annual Take-Home</th><th>Monthly Take-Home</th></tr>
  <tr><td>37.5h (standard full-time)</td><td>${fmt(grossStd)}</td><td>${fmt(grossStd / 12)}</td><td><strong>${fmt(bdStd.net)}</strong></td><td>${fmt(bdStd.monthly)}</td></tr>
  <tr><td>40h</td><td>${fmt(grossFT)}</td><td>${fmt(grossFT / 12)}</td><td><strong>${fmt(bdFT.net)}</strong></td><td>${fmt(bdFT.monthly)}</td></tr>
  </table></div>
  <p>Use the calculator above to recalculate for your exact hours or unpaid weeks (e.g. term-time-only or unpaid leave roles).</p>

  <h2>Is ${rateLabel} an Hour Good Pay?</h2>
  <p>${nlwSentence} ${tierContext(rate)}</p>

  <h2>Browse Nearby Hourly Rates</h2>
  <div class="nearby-grid">${nearbyHtml}</div>
  <p>Working part-time instead of full-time hours? Use the <a href="/hourly-to-salary-calculator/">Hourly to Salary &amp; Pro-Rata Calculator</a> to pro-rata a full-time salary to your actual hours.</p>`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebApplication", "name": title, "url": canonical, "description": metaDesc, "applicationCategory": "FinanceApplication", "operatingSystem": "Any", "inLanguage": "en-GB", "offers": { "@type": "Offer", "price": "0", "priceCurrency": "GBP" }, "areaServed": { "@type": "Country", "name": "United Kingdom" } },
      { "@type": "FAQPage", "mainEntity": faqJsonLd(faqs) },
      { "@type": "BreadcrumbList", "itemListElement": [{ "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL + "/" }, { "@type": "ListItem", "position": 2, "name": "Hourly to Salary Calculator", "item": SITE_URL + "/hourly-to-salary-calculator/" }, { "@type": "ListItem", "position": 3, "name": title, "item": canonical }] }
    ]
  };

  return pageHead(metaTitle, metaDesc, canonical, jsonLd) + `
<header>
  <div class="flag">🇬🇧 UK Payroll · 2026/27 Rates</div>
  <h1>${title}</h1>
  <p>${rateLabel} an hour is <strong>${fmt(grossStd)}</strong> a year on a 37.5-hour week — take-home pay and full breakdown below.</p>
</header>

<div class="tool-card">
${toolHtml}
</div>

<div class="content">
  ${extraContent}

  <h2>Explore More Payroll Calculators</h2>
  <div class="sat-grid">${satGrid()}</div>

  ${CTA_PAYROLL_SOFTWARE}

  ${eeatSection(title)}

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

// ============ HUB: hourly-to-salary-calculator (dual-mode tool) ============
function hubHtml() {
  const canonical = `${SITE_URL}/hourly-to-salary-calculator/`;
  const title = 'Hourly to Salary & Pro-Rata Calculator';
  const metaTitle = `Hourly to Salary Calculator UK 2026/27 — Pro-Rata Too | mynetsalary.co.uk`;
  const metaDesc = `Convert an hourly rate to annual salary, or pro-rata a full-time salary to part-time hours — with instant Income Tax and NI take-home breakdown, 2026/27 rates.`;

  const groupRanges = [
    { label: `£8 – £20/hr (minimum wage to experienced entry-level)`, items: HOURLY_RATES.filter(r => r <= 20) },
    { label: `£21 – £35/hr (skilled, technical, junior professional)`, items: HOURLY_RATES.filter(r => r > 20 && r <= 35) },
    { label: `£40 – £100/hr (senior professional to contractor day-rate)`, items: HOURLY_RATES.filter(r => r > 35) }
  ];
  const groupsHtml = groupRanges.map(g => `
  <h3>${g.label}</h3>
  <div class="nearby-grid">${g.items.map(r => `<a class="nearby-link" href="/${slugFor(r)}/">£${fmt2(r).slice(1)}/hr</a>`).join('\n')}</div>`).join('\n');

  const faqs = [
    { q: 'How do I convert an hourly rate to an annual salary?', a: 'Multiply your hourly rate by your hours per week, then by the number of paid weeks in a year: Annual Salary = Hourly Rate × Hours per Week × Paid Weeks. The UK standard full-time week is 37.5 hours, giving 1,950 hours a year at 52 paid weeks — though many employers use a 40-hour week instead.' },
    { q: 'Should I use 37.5 or 40 hours a week?', a: 'Use whichever matches your actual contracted hours — both are common in the UK. A 37.5-hour week (7.5h/day, with a paid lunch usually excluded) is typical in office and professional roles; a 40-hour week is common in retail, hospitality and manual roles. The difference is meaningful: at £20/hour it is £2,600 a year in gross pay.' },
    { q: 'What is a pro-rata salary?', a: 'A pro-rata salary scales a full-time salary down proportionally to the hours you actually work: Pro-Rata Salary = Full-Time Salary × (Your Hours ÷ Full-Time Hours). It is used for part-time, job-share and term-time-only roles advertised with a full-time-equivalent (FTE) figure.' },
    { q: 'Does pro-rata salary include holiday pay?', a: 'Yes — statutory holiday entitlement (5.6 weeks for a full-time worker) is also pro-rated to your hours, and for most part-time employees on a fixed weekly pattern it is already built into the annual pro-rata salary rather than paid as a separate lump sum. Irregular-hours and term-time-only workers usually accrue holiday pay per hour worked instead — check your contract.' },
    { q: 'Is pro-rata pay based on hours or days?', a: 'Either can be used, and your contract should specify which. Hours-based pro-rata (your hours ÷ full-time hours) is more accurate when your working pattern varies by day; days-based pro-rata (your days ÷ full-time days, usually 5) is simpler when you work fixed whole days.' },
    { q: 'Do I pay less tax on a pro-rata or part-time salary?', a: 'You pay the same Income Tax and National Insurance rates as anyone else — tax is calculated on your actual annual salary, not your full-time-equivalent figure. Because the Personal Allowance and tax bands are unaffected by hours worked, a lower pro-rata salary will usually mean a lower effective tax rate simply because less of it falls into higher bands.' },
    { q: 'What counts as full-time hours in the UK?', a: 'There is no single legal definition — HMRC and ONS commonly treat 35+ hours a week as full-time, but individual employers define their own full-time week (most often 37.5 or 40 hours) in the contract, and that figure is what pro-rata calculations should use.' }
  ];

  const toolHtml = `
  <div class="input-group"><label>Calculate</label>
    <div class="seg-row" id="modeSeg">
      <div class="seg-btn active" data-val="hourly">Hourly → Salary</div>
      <div class="seg-btn" data-val="prorata">Pro-Rata Salary</div>
    </div>
  </div>

  <div id="hourlyInputs">
    <div class="two-col">
      <div class="input-group"><label>Hourly Rate (£)</label><input type="number" id="hourlyRate" min="0" step="0.5" value="15"></div>
      <div class="input-group"><label>Hours per Week</label><input type="number" id="hoursWeek" min="1" max="80" step="0.5" value="37.5"></div>
    </div>
    <div class="input-group"><label>Paid Weeks per Year</label>
      <div class="hint">52 for salaried staff with paid annual leave included; lower for unpaid weeks (e.g. term-time only)</div>
      <input type="number" id="weeksYear" min="1" max="52" step="1" value="52">
    </div>
  </div>

  <div id="prorataInputs" style="display:none;">
    <div class="input-group"><label>Full-Time Equivalent Annual Salary (£)</label><input type="number" id="fteSalary" min="0" step="500" value="35000"></div>
    <div class="two-col">
      <div class="input-group"><label>Your Hours per Week</label><input type="number" id="yourHours" min="1" max="80" step="0.5" value="22.5"></div>
      <div class="input-group"><label>Full-Time Hours per Week</label><input type="number" id="ftHours" min="1" max="80" step="0.5" value="37.5"></div>
    </div>
  </div>

  <button class="btn" onclick="calculate()">Calculate →</button>
  <div class="results" id="results">
    <div class="result-hero"><div class="value" id="r-gross">—</div><div class="label" id="r-gross-label">Annual Gross Salary</div></div>
    <div class="results-grid">
      <div class="result-box"><div class="label">Monthly Gross</div><div class="value" id="r-grossmonth">—</div></div>
      <div class="result-box accent"><div class="label">Tax + NI</div><div class="value" id="r-deductions">—</div></div>
      <div class="result-box"><div class="label">Take-Home</div><div class="value" id="r-takehome">—</div></div>
    </div>
    <div class="band-breakdown">
      <div><span>Monthly Take-Home</span><span id="r-takehomemonth">—</span></div>
      <div><span>Weekly Take-Home</span><span id="r-takehomeweek">—</span></div>
    </div>
  </div>`;

  const toolJs = `
document.querySelectorAll('#modeSeg .seg-btn').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('#modeSeg .seg-btn').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  const mode=b.dataset.val;
  document.getElementById('hourlyInputs').style.display=mode==='hourly'?'block':'none';
  document.getElementById('prorataInputs').style.display=mode==='prorata'?'block':'none';
  document.getElementById('results').classList.remove('show');
}));
function personalAllowance(income){ if(income<=100000) return 12570; return Math.max(0,12570-(income-100000)/2); }
function incomeTax(taxable){ const pa=personalAllowance(taxable); return bandedTax(taxable,[[0,pa,0],[pa,50270,0.20],[50270,125140,0.40],[125140,Infinity,0.45]]); }
function nationalInsurance(gross){ return bandedTax(gross,[[0,12570,0],[12570,50270,0.08],[50270,Infinity,0.02]]); }
function calculate(){
  const mode=document.querySelector('#modeSeg .seg-btn.active').dataset.val;
  let gross=0, label='Annual Gross Salary';
  if(mode==='hourly'){
    const rate=parseFloat(document.getElementById('hourlyRate').value)||0;
    const hours=parseFloat(document.getElementById('hoursWeek').value)||0;
    const weeks=parseFloat(document.getElementById('weeksYear').value)||52;
    gross=rate*hours*weeks;
    label='Annual Gross Salary (from hourly rate)';
  } else {
    const fte=parseFloat(document.getElementById('fteSalary').value)||0;
    const yourHours=parseFloat(document.getElementById('yourHours').value)||0;
    const ftHours=parseFloat(document.getElementById('ftHours').value)||37.5;
    gross=ftHours>0?fte*(yourHours/ftHours):0;
    label='Pro-Rata Annual Salary';
  }
  const it=incomeTax(gross), ni=nationalInsurance(gross), deductions=it+ni, takeHome=gross-deductions;
  document.getElementById('r-gross').textContent=fmt(gross);
  document.getElementById('r-gross-label').textContent=label;
  document.getElementById('r-grossmonth').textContent=fmt(gross/12);
  document.getElementById('r-deductions').textContent=fmt(deductions);
  document.getElementById('r-takehome').textContent=fmt(takeHome);
  document.getElementById('r-takehomemonth').textContent=fmt(takeHome/12);
  document.getElementById('r-takehomeweek').textContent=fmt(takeHome/52);
  document.getElementById('results').classList.add('show');
}`;

  const extraContent = `
  <h2>How to Convert Hourly Pay to Annual Salary</h2>
  <p><strong>Annual Salary = Hourly Rate × Hours per Week × Paid Weeks per Year.</strong> Most UK full-time contracts use either a 37.5-hour or 40-hour week, and 52 paid weeks once annual leave is included. Enter your own hours above for an exact figure — the table below shows common rates at the standard 37.5-hour week.</p>
  <div class="table-wrap"><table><tr><th>Hourly Rate</th><th>Annual (37.5h/wk)</th><th>Annual Take-Home</th></tr>
  ${[12.71, 15, 18, 20, 25, 30, 40, 50].map(r => { const g = r * STANDARD_HOURS_WEEK * WEEKS_YEAR; const bd = breakdown(g); return `<tr><td>${fmt2(r)}</td><td>${fmt(g)}</td><td>${fmt(bd.net)}</td></tr>`; }).join('\n')}
  </table></div>

  <h2>What Is a Pro-Rata Salary?</h2>
  <p><strong>Pro-Rata Salary = Full-Time Salary × (Your Hours ÷ Full-Time Hours).</strong> If a role is advertised at £35,000 full-time-equivalent (FTE) for 37.5 hours a week and you work 22.5 hours (3 days), your pro-rata salary is £35,000 × (22.5 ÷ 37.5) = £21,000 a year. Income Tax and National Insurance are then calculated on that £21,000 exactly as for any other salary — the Personal Allowance and tax bands are not adjusted for part-time hours.</p>

  <h2>Browse Hourly Rates by Range</h2>
  ${groupsHtml}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebApplication", "name": title, "url": canonical, "description": metaDesc, "applicationCategory": "FinanceApplication", "operatingSystem": "Any", "inLanguage": "en-GB", "offers": { "@type": "Offer", "price": "0", "priceCurrency": "GBP" }, "areaServed": { "@type": "Country", "name": "United Kingdom" } },
      { "@type": "FAQPage", "mainEntity": faqJsonLd(faqs) },
      { "@type": "BreadcrumbList", "itemListElement": [{ "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL + "/" }, { "@type": "ListItem", "position": 2, "name": title, "item": canonical }] }
    ]
  };

  return pageHead(metaTitle, metaDesc, canonical, jsonLd) + `
<header>
  <div class="flag">🇬🇧 UK Payroll · 2026/27 Rates</div>
  <h1>${title}</h1>
  <p>Convert an hourly rate to an annual salary, or pro-rata a full-time salary to part-time hours — with instant Income Tax and NI take-home.</p>
</header>

<div class="tool-card">
${toolHtml}
</div>

<div class="content">
  ${extraContent}

  <h2>Explore More Payroll Calculators</h2>
  <div class="sat-grid">${satGrid()}</div>

  ${CTA_PAYROLL_SOFTWARE}

  ${eeatSection(title)}

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

// ============ BUILD ============
const hubDir = path.join(__dirname, 'hourly-to-salary-calculator');
fs.mkdirSync(hubDir, { recursive: true });
fs.writeFileSync(path.join(hubDir, 'index.html'), hubHtml());
console.log('Wrote hourly-to-salary-calculator/index.html');

for (const rate of HOURLY_RATES) {
  const dir = path.join(__dirname, slugFor(rate));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), pageHtml(rate));
}
console.log('Wrote', HOURLY_RATES.length, 'hourly-rate tranche pages');

const urls = [`${SITE_URL}/hourly-to-salary-calculator/`, ...HOURLY_RATES.map(r => `${SITE_URL}/${slugFor(r)}/`)];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(u => `  <url><loc>${u}</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>`).join('\n') +
  `\n</urlset>\n`;
fs.writeFileSync(path.join(__dirname, 'sitemap-hourly.xml'), sitemap);
console.log('Wrote sitemap-hourly.xml with', urls.length, 'URLs');
