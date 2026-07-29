// Generates £X-after-tax-uk/ pSEO pages (salary tranches) + tranche sitemap.xml
// Engine mirrors index.html / generate-pages.js — keep in sync if rates change.
const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://mynetsalary.co.uk';
const GSC_TAG = 'F0g9xdQ9RU5cTssBiWtkj41-7q2_kIwcKbJc_sMTthQ';
const NATIONAL_MEDIAN = 39039; // ONS ASHE, full-time employees, April 2025 release — most recent available

const PT = 12570, UEL = 50270;

function bandedTax(income, bands) {
  let tax = 0;
  for (const [lo, hi, rate] of bands) { if (income > lo) tax += (Math.min(income, hi) - lo) * rate; }
  return tax;
}
function personalAllowance(income) { if (income <= 100000) return 12570; return Math.max(0, 12570 - (income - 100000) / 2); }
function incomeTax(taxable, region) {
  const pa = personalAllowance(taxable);
  if (region === 'scotland') return bandedTax(taxable, [[0, pa, 0], [pa, 16537, 0.19], [16537, 29526, 0.20], [29526, 43662, 0.21], [43662, 75000, 0.42], [75000, 125140, 0.45], [125140, Infinity, 0.48]]);
  return bandedTax(taxable, [[0, pa, 0], [pa, 50270, 0.20], [50270, 125140, 0.40], [125140, Infinity, 0.45]]);
}
function nationalInsurance(gross) { return bandedTax(gross, [[0, PT, 0], [PT, UEL, 0.08], [UEL, Infinity, 0.02]]); }

function bandInfo(gross, region) {
  const pa = personalAllowance(gross);
  // Between £100,000 and £125,140, Personal Allowance withdraws £1 per £2 earned, so the
  // true marginal rate on the next £1 is 1.5x the nominal band rate (that extra 50p of
  // allowance lost is itself taxed at the nominal rate).
  const inTaper = gross >= 100000 && gross < 125140;
  if (region === 'scotland') {
    if (gross <= pa) return { name: 'Personal Allowance (tax-free)', marginal: 0 };
    if (gross <= 16537) return { name: 'Starter rate', marginal: 0.19 };
    if (gross <= 29526) return { name: 'Basic rate', marginal: 0.20 };
    if (gross <= 43662) return { name: 'Intermediate rate', marginal: 0.21 };
    if (inTaper && gross <= 75000) return { name: 'Higher rate (Personal Allowance tapering)', marginal: 0.42 * 1.5 };
    if (gross <= 75000) return { name: 'Higher rate', marginal: 0.42 };
    if (inTaper) return { name: 'Advanced rate (Personal Allowance tapering)', marginal: 0.45 * 1.5 };
    if (gross <= 125140) return { name: 'Advanced rate', marginal: 0.45 };
    return { name: 'Top rate', marginal: 0.48 };
  }
  if (gross <= pa) return { name: 'Personal Allowance (tax-free)', marginal: 0 };
  if (gross <= 50270) return { name: 'Basic rate', marginal: 0.20 };
  if (inTaper) return { name: 'Higher rate (Personal Allowance tapering)', marginal: 0.40 * 1.5 };
  if (gross <= 125140) return { name: 'Higher rate', marginal: 0.40 };
  return { name: 'Additional rate', marginal: 0.45 };
}

function breakdown(gross, region) {
  const it = incomeTax(gross, region);
  const ni = nationalInsurance(gross);
  const net = gross - it - ni;
  return {
    gross, it, ni, net,
    monthly: net / 12, weekly: net / 52, daily: net / 260, hourly: net / (260 * 7.5),
    effectiveRate: gross > 0 ? (it + ni) / gross : 0,
    band: bandInfo(gross, region)
  };
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
  .seg-row { display: flex; gap: 8px; flex-wrap: wrap; }
  .seg-btn { flex: 1; min-width: 100px; padding: 10px 12px; border: 1.5px solid var(--border); border-radius: 8px; background: white; font-size: 0.85rem; font-weight: 600; cursor: pointer; text-align: center; color: var(--text); }
  .seg-btn.active { background: var(--brand); color: white; border-color: var(--brand); }
  .results { background: var(--brand-light); border-radius: var(--radius); padding: 24px; margin-top: 24px; }
  .result-hero { text-align: center; padding: 12px 0 20px; }
  .result-hero .value { font-size: 2.2rem; font-weight: 800; color: var(--brand); }
  .result-hero .label { font-size: 0.85rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
  .results-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 16px; }
  @media (max-width: 500px) { .results-grid { grid-template-columns: 1fr 1fr; } }
  .result-box { background: white; border-radius: 8px; padding: 12px 10px; text-align: center; }
  .result-box .label { font-size: 0.68rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; }
  .result-box .value { font-size: 1.05rem; font-weight: 700; color: var(--brand); }
  .band-breakdown { background: white; border-radius: 8px; padding: 14px 16px; margin-top: 12px; font-size: 0.85rem; }
  .band-breakdown div { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid var(--border); }
  .band-breakdown div:last-child { border-bottom: none; font-weight: 700; }
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
function pct(n) { return (n * 100).toFixed(1) + '%'; }

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
          <p>An independent calculator applying published HMRC/gov.scot rates deterministically — no AI estimate, no official affiliation.</p>
        </div>
      </div>
      <div class="eeat-compliance">
        <div class="eeat-compliance-item">
          <svg class="eeat-compliance-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
          <div class="eeat-compliance-text"><h4>Methodology &amp; Sources</h4><p>Figures use published HMRC/gov.scot rates and ONS ASHE median salary data. For your exact position, use <a href="https://www.gov.uk/estimate-income-tax" target="_blank" rel="noopener">gov.uk/estimate-income-tax</a>.</p></div>
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

// ============ TRANCHES ============
const TRANCHES = [
  ...Array.from({ length: 46 }, (_, i) => 15000 + i * 1000), // 15,000 – 60,000 step 1,000
  ...Array.from({ length: 18 }, (_, i) => 65000 + i * 5000)  // 65,000 – 150,000 step 5,000
];

function slugFor(amount) { return `${amount}-after-tax-uk`; }

function nearbySteps(amount) {
  const idx = TRANCHES.indexOf(amount);
  const out = [];
  for (const offset of [-2, -1, 1, 2]) {
    const n = TRANCHES[idx + offset];
    if (n !== undefined) out.push(n);
  }
  return out.sort((a, b) => a - b);
}

function pageHtml(amount) {
  const restUk = breakdown(amount, 'rest_uk');
  const scot = breakdown(amount, 'scotland');
  const slug = slugFor(amount);
  const canonical = `${SITE_URL}/${slug}/`;
  const title = `£${amount.toLocaleString('en-GB')} After Tax UK`;
  const metaTitle = `${title} — Take-Home Pay 2026/27 | mynetsalary.co.uk`;
  const metaDesc = `£${amount.toLocaleString('en-GB')} after tax UK: take-home pay is ${fmt(restUk.net)} a year (${fmt(restUk.monthly)}/month). Full Income Tax and NI breakdown, England, Wales, NI & Scotland, 2026/27 rates.`;
  const vsMedian = amount - NATIONAL_MEDIAN;
  const vsMedianPct = (vsMedian / NATIONAL_MEDIAN) * 100;
  const comparisonSentence = Math.abs(vsMedianPct) < 1
    ? `This is almost exactly the UK full-time median salary of ${fmt(NATIONAL_MEDIAN)} (ONS, April 2025).`
    : vsMedian > 0
      ? `This is ${fmt(Math.abs(vsMedian))} (${Math.abs(vsMedianPct).toFixed(0)}%) above the UK full-time median salary of ${fmt(NATIONAL_MEDIAN)} (ONS, April 2025).`
      : `This is ${fmt(Math.abs(vsMedian))} (${Math.abs(vsMedianPct).toFixed(0)}%) below the UK full-time median salary of ${fmt(NATIONAL_MEDIAN)} (ONS, April 2025).`;

  const nearby = nearbySteps(amount);
  const nearbyHtml = [...nearby.filter(n => n < amount), amount, ...nearby.filter(n => n > amount)]
    .sort((a, b) => a - b)
    .map(n => n === amount
      ? `<span class="nearby-link current">£${n.toLocaleString('en-GB')}</span>`
      : `<a class="nearby-link" href="/${slugFor(n)}/">£${n.toLocaleString('en-GB')}</a>`)
    .join('\n');

  const faqs = [
    { q: `How much is £${amount.toLocaleString('en-GB')} after tax in the UK?`, a: `On a £${amount.toLocaleString('en-GB')} salary in England, Wales or Northern Ireland, take-home pay is ${fmt(restUk.net)} a year — ${fmt(restUk.monthly)} a month, or ${fmt(restUk.weekly)} a week — after ${fmt(restUk.it)} Income Tax and ${fmt(restUk.ni)} National Insurance, 2026/27 rates.` },
    { q: `Is £${amount.toLocaleString('en-GB')} a good salary in the UK?`, a: comparisonSentence + ` Whether it feels "good" also depends heavily on where you live — the same salary stretches much further outside London and the South East.` },
    { q: `What tax band is £${amount.toLocaleString('en-GB')} in?`, a: `In England, Wales and Northern Ireland, £${amount.toLocaleString('en-GB')} falls in the ${restUk.band.name} (${pct(restUk.band.marginal)} marginal rate). In Scotland, it falls in the ${scot.band.name} (${pct(scot.band.marginal)} marginal rate) under Scotland's separate Income Tax bands.` },
    { q: `Is take-home pay on £${amount.toLocaleString('en-GB')} different in Scotland?`, a: amount <= 16000
        ? `At this salary the difference is minimal or zero — most of the amount sits within the tax-free Personal Allowance in both systems.`
        : `Yes — Scotland's Income Tax bands differ from the rest of the UK. On £${amount.toLocaleString('en-GB')}, Scottish take-home pay is ${fmt(scot.net)} a year, compared to ${fmt(restUk.net)} in England, Wales and Northern Ireland — a difference of ${fmt(Math.abs(restUk.net - scot.net))}.` }
  ];

  const toolHtml = `
  <div class="input-group"><label>Region</label>
    <div class="seg-row" id="regionSeg">
      <div class="seg-btn active" data-val="rest_uk">England / Wales / NI</div>
      <div class="seg-btn" data-val="scotland">Scotland</div>
    </div>
  </div>
  <div class="results" id="results">
    <div class="result-hero"><div class="value" id="r-takehome">${fmt(restUk.net)}</div><div class="label">Annual Take-Home Pay</div></div>
    <div class="results-grid">
      <div class="result-box"><div class="label">Monthly</div><div class="value" id="r-monthly">${fmt(restUk.monthly)}</div></div>
      <div class="result-box"><div class="label">Weekly</div><div class="value" id="r-weekly">${fmt(restUk.weekly)}</div></div>
      <div class="result-box"><div class="label">Daily</div><div class="value" id="r-daily">${fmt(restUk.daily)}</div></div>
    </div>
    <div class="band-breakdown">
      <div><span>Gross Salary</span><span id="r-gross">${fmt(amount)}</span></div>
      <div><span>Income Tax</span><span id="r-it">${fmt(restUk.it)}</span></div>
      <div><span>National Insurance</span><span id="r-ni">${fmt(restUk.ni)}</span></div>
      <div><span>Take-Home Pay</span><span id="r-total">${fmt(restUk.net)}</span></div>
    </div>
  </div>`;

  const toolJs = `
const GROSS=${amount};
const DATA={
  rest_uk:{net:${restUk.net},monthly:${restUk.monthly},weekly:${restUk.weekly},daily:${restUk.daily},it:${restUk.it},ni:${restUk.ni}},
  scotland:{net:${scot.net},monthly:${scot.monthly},weekly:${scot.weekly},daily:${scot.daily},it:${scot.it},ni:${scot.ni}}
};
document.querySelectorAll('#regionSeg .seg-btn').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('#regionSeg .seg-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');
  const d=DATA[b.dataset.val];
  document.getElementById('r-takehome').textContent=fmt(d.net);
  document.getElementById('r-monthly').textContent=fmt(d.monthly);
  document.getElementById('r-weekly').textContent=fmt(d.weekly);
  document.getElementById('r-daily').textContent=fmt(d.daily);
  document.getElementById('r-it').textContent=fmt(d.it);
  document.getElementById('r-ni').textContent=fmt(d.ni);
  document.getElementById('r-total').textContent=fmt(d.net);
}));`;

  const extraContent = `
  <h2>Full Breakdown: £${amount.toLocaleString('en-GB')} After Tax</h2>
  <div class="table-wrap"><table>
  <tr><th>Period</th><th>Gross</th><th>Income Tax</th><th>National Insurance</th><th>Take-Home</th></tr>
  <tr><td>Annual</td><td>${fmt(restUk.gross)}</td><td>${fmt(restUk.it)}</td><td>${fmt(restUk.ni)}</td><td><strong>${fmt(restUk.net)}</strong></td></tr>
  <tr><td>Monthly</td><td>${fmt(restUk.gross / 12)}</td><td>${fmt(restUk.it / 12)}</td><td>${fmt(restUk.ni / 12)}</td><td><strong>${fmt(restUk.monthly)}</strong></td></tr>
  <tr><td>Weekly</td><td>${fmt(restUk.gross / 52)}</td><td>${fmt(restUk.it / 52)}</td><td>${fmt(restUk.ni / 52)}</td><td><strong>${fmt(restUk.weekly)}</strong></td></tr>
  <tr><td>Daily (5-day week)</td><td>${fmt(restUk.gross / 260)}</td><td>${fmt(restUk.it / 260)}</td><td>${fmt(restUk.ni / 260)}</td><td><strong>${fmt(restUk.daily)}</strong></td></tr>
  <tr><td>Hourly (37.5h week)</td><td>${fmt(restUk.gross / (260 * 7.5))}</td><td>${fmt(restUk.it / (260 * 7.5))}</td><td>${fmt(restUk.ni / (260 * 7.5))}</td><td><strong>${fmt(restUk.hourly)}</strong></td></tr>
  </table></div>
  <p>Effective tax rate (Income Tax + NI as a share of gross): <strong>${pct(restUk.effectiveRate)}</strong>. Marginal rate on the next £1 earned: <strong>${pct(restUk.band.marginal)}</strong> (${restUk.band.name}).</p>

  <h2>England/Wales/NI vs Scotland</h2>
  <div class="table-wrap"><table>
  <tr><th>Region</th><th>Income Tax</th><th>National Insurance</th><th>Take-Home Pay</th></tr>
  <tr><td>England, Wales, Northern Ireland</td><td>${fmt(restUk.it)}</td><td>${fmt(restUk.ni)}</td><td><strong>${fmt(restUk.net)}</strong></td></tr>
  <tr><td>Scotland</td><td>${fmt(scot.it)}</td><td>${fmt(scot.ni)}</td><td><strong>${fmt(scot.net)}</strong></td></tr>
  </table></div>
  <p>${amount > 16000 ? `Living in Scotland on £${amount.toLocaleString('en-GB')} means a difference of ${fmt(Math.abs(restUk.net - scot.net))} a year in take-home pay compared to the rest of the UK, because Scotland sets its own Income Tax bands.` : `At this income level, the England/Scotland difference is negligible — most or all of the salary falls within the tax-free Personal Allowance either way.`}</p>

  <h2>How £${amount.toLocaleString('en-GB')} Compares</h2>
  <p>${comparisonSentence}</p>

  <h2>Browse Nearby Salaries</h2>
  <div class="nearby-grid">${nearbyHtml}</div>`;

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
    { "@type": "BreadcrumbList", "itemListElement": [ { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL + "/" }, { "@type": "ListItem", "position": 2, "name": "Salary After Tax", "item": SITE_URL + "/salary-after-tax/" }, { "@type": "ListItem", "position": 3, "name": title, "item": canonical } ] }
  ]
}, null, 2)}
</script>

<style>${CSS}</style>
</head>
<body>

<header>
  <div class="flag">🇬🇧 UK Payroll · 2026/27 Rates</div>
  <h1>${title}</h1>
  <p>Take-home pay on a £${amount.toLocaleString('en-GB')} salary is <strong>${fmt(restUk.net)}</strong> a year — full Income Tax and National Insurance breakdown below.</p>
</header>

<div class="tool-card">
${toolHtml}
</div>

<div class="content">
  ${extraContent}

  <h2>Explore More Payroll Calculators</h2>
  <div class="sat-grid">
    <a class="sat-link" href="/"><div class="t">Take-Home Pay Calculator</div><div class="d">Full salary breakdown, any amount</div></a>
    <a class="sat-link" href="/required-salary-calculator/"><div class="t">Required Salary Calculator</div><div class="d">Gross salary needed for a target take-home</div></a>
    <a class="sat-link" href="/compare-two-salaries-calculator/"><div class="t">Compare Two Salaries</div><div class="d">Job offer take-home pay, side by side</div></a>
    <a class="sat-link" href="/pension-contribution-calculator/"><div class="t">Pension Contribution Calculator</div><div class="d">Auto-enrolment & salary sacrifice</div></a>
  </div>

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
function toggleFaq(el) { el.classList.toggle('open'); el.nextElementSibling.classList.toggle('show'); }
${toolJs}
</script>

</body>
</html>`;
}

function hubHtml() {
  const canonical = `${SITE_URL}/salary-after-tax/`;
  const metaTitle = `Salary After Tax UK 2026/27 — Browse by Amount | mynetsalary.co.uk`;
  const metaDesc = `Browse take-home pay for any UK salary from £15,000 to £150,000. Instant Income Tax and National Insurance breakdown for every amount, 2026/27 rates.`;
  const groups = [
    { label: '£15,000 – £30,000', items: TRANCHES.filter(a => a >= 15000 && a <= 30000) },
    { label: '£31,000 – £45,000', items: TRANCHES.filter(a => a >= 31000 && a <= 45000) },
    { label: '£46,000 – £60,000', items: TRANCHES.filter(a => a >= 46000 && a <= 60000) },
    { label: '£65,000 – £150,000', items: TRANCHES.filter(a => a >= 65000) }
  ];
  const groupsHtml = groups.map(g => `
  <h2>${g.label}</h2>
  <div class="nearby-grid">${g.items.map(n => `<a class="nearby-link" href="/${slugFor(n)}/">£${n.toLocaleString('en-GB')}</a>`).join('\n')}</div>`).join('\n');

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
<meta name="google-site-verification" content="${GSC_TAG}" />
<style>${CSS}</style>
</head>
<body>
<header>
  <div class="flag">🇬🇧 UK Payroll · 2026/27 Rates</div>
  <h1>Salary After Tax — Browse by Amount</h1>
  <p>Take-home pay for ${TRANCHES.length} salary levels from £15,000 to £150,000. Pick your salary for the full Income Tax and NI breakdown.</p>
</header>
<div class="content" style="margin-top:40px;">
  ${groupsHtml}
  <p style="margin-top:30px;">Salary between two amounts, or want to enter your exact figure? Use the <a href="/">main take-home pay calculator</a> for pension and student loan too.</p>
</div>
<footer>
  <p>Information only — not tax or legal advice. Data based on 2026/27 rates.</p>
</footer>
</body>
</html>`;
}

// ============ BUILD ============
for (const amount of TRANCHES) {
  const dir = path.join(__dirname, slugFor(amount));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), pageHtml(amount));
}
console.log('Wrote', TRANCHES.length, 'salary-tranche pages');

const hubDir = path.join(__dirname, 'salary-after-tax');
fs.mkdirSync(hubDir, { recursive: true });
fs.writeFileSync(path.join(hubDir, 'index.html'), hubHtml());
console.log('Wrote salary-after-tax/index.html hub');

const urls = [`${SITE_URL}/salary-after-tax/`, ...TRANCHES.map(a => `${SITE_URL}/${slugFor(a)}/`)];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(u => `  <url><loc>${u}</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>`).join('\n') +
  `\n</urlset>\n`;
fs.writeFileSync(path.join(__dirname, 'sitemap-tranches.xml'), sitemap);
console.log('Wrote sitemap-tranches.xml with', urls.length, 'URLs');
