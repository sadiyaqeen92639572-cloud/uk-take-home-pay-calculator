// Generates historical tax-year calculator pages (2023/24, 2024/25, 2025/26)
// Rates verified against gov.scot band pages + HMRC/Commons Library NI rate history — see YEARS comments for sources.
const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://mynetsalary.co.uk';
const GSC_TAG = 'F0g9xdQ9RU5cTssBiWtkj41-7q2_kIwcKbJc_sMTthQ';

// Rest-of-UK Income Tax bands (PA £12,570, 20%/40%/45%) have been frozen since 2021/22 — same for all 3 years below.
// NI Primary Threshold £12,570 and UEL £50,270 also unchanged since July 2022.
const YEARS = [
  {
    slug: 'uk-tax-calculator-2025-26',
    label: '2025/26',
    niRate: 0.08, // unchanged from 2024/25 — HM Treasury Spring Statement 2025
    niNote: 'The employee NI main rate stayed at 8% for 2025/26, unchanged from the April 2024 cut.',
    scotland: [[0, 12570, 0], [12570, 15397, 0.19], [15397, 27491, 0.20], [27491, 43662, 0.21], [43662, 75000, 0.42], [75000, 125140, 0.45], [125140, Infinity, 0.48]],
    source: 'gov.scot Scottish Income Tax 2025/26 rates and bands'
  },
  {
    slug: 'uk-tax-calculator-2024-25',
    label: '2024/25',
    niRate: 0.08, // cut from 10% to 8% on 6 April 2024 (Spring Budget 2024)
    niNote: 'The employee NI main rate was cut from 10% to 8% on 6 April 2024, applying for the full 2024/25 tax year.',
    scotland: [[0, 12570, 0], [12570, 14876, 0.19], [14876, 26561, 0.20], [26561, 43662, 0.21], [43662, 75000, 0.42], [75000, 125140, 0.45], [125140, Infinity, 0.48]],
    source: 'gov.scot Scottish Income Tax 2024/25 rates and bands'
  },
  {
    slug: 'uk-tax-calculator-2023-24',
    label: '2023/24',
    niRate: 0.115, // blended: 12% from 6 Apr 2023, cut to 10% from 6 Jan 2024 — weighted 9mo@12% + 3mo@10% = 11.5%
    niNote: 'National Insurance changed mid-year: 12% from April 2023, cut to 10% from 6 January 2024. This calculator uses a blended annual rate of 11.5% (9 months at 12% + 3 months at 10%) — your actual in-year deduction varied by pay period.',
    scotland: [[0, 12570, 0], [12570, 14732, 0.19], [14732, 25688, 0.20], [25688, 43662, 0.21], [43662, 125140, 0.42], [125140, Infinity, 0.47]],
    source: 'gov.scot Scottish Income Tax 2023/24 rates and bands'
  }
];

function bandedTax(income, bands) {
  let tax = 0;
  for (const [lo, hi, rate] of bands) { if (income > lo) tax += (Math.min(income, hi) - lo) * rate; }
  return tax;
}
function personalAllowance(income) { if (income <= 100000) return 12570; return Math.max(0, 12570 - (income - 100000) / 2); }
function restUkTax(taxable) {
  const pa = personalAllowance(taxable);
  return bandedTax(taxable, [[0, pa, 0], [pa, 50270, 0.20], [50270, 125140, 0.40], [125140, Infinity, 0.45]]);
}
function scotlandTax(taxable, bands) {
  const pa = personalAllowance(taxable);
  const adjusted = bands.map((b, i) => i === 1 ? [pa, b[1], b[2]] : b); // starter band floor tracks PA
  return bandedTax(taxable, adjusted);
}
function ni(gross, rate) {
  return bandedTax(gross, [[0, 12570, 0], [12570, 50270, rate], [50270, Infinity, 0.02]]);
}

const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --brand: #1e5fae; --brand-dark: #123e73; --brand-light: #e7f0fb;
    --accent: #b91c1c; --success: #16a34a; --text: #1a1a2e; --muted: #64748b; --border: #e2e8f0; --radius: 12px;
  }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: var(--text); background: #f8fafc; line-height: 1.6; }
  header { background: linear-gradient(135deg, var(--brand) 0%, var(--brand-dark) 100%); color: white; padding: 48px 20px 80px; text-align: center; }
  header p { color: rgba(255,255,255,0.88); font-size: 1.05rem; margin-top: 10px; max-width: 640px; margin-left: auto; margin-right: auto; }
  h1 { font-size: clamp(1.5rem, 4vw, 2.3rem); font-weight: 800; letter-spacing: -0.5px; }
  .flag { font-size: 0.85rem; background: rgba(255,255,255,0.15); border-radius: 20px; padding: 4px 14px; display: inline-block; margin-bottom: 16px; letter-spacing: 1px; }
  .tool-card { background: white; border-radius: var(--radius); box-shadow: 0 4px 32px rgba(0,0,0,0.10); margin: -48px auto 40px; max-width: 720px; padding: 36px 32px; position: relative; z-index: 10; }
  .input-group { margin-bottom: 20px; }
  .input-group label { display: block; font-weight: 600; font-size: 0.9rem; margin-bottom: 6px; color: var(--text); }
  input[type="number"] { width: 100%; padding: 10px 14px; border: 1.5px solid var(--border); border-radius: 8px; font-size: 1rem; background: white; }
  .seg-row { display: flex; gap: 8px; flex-wrap: wrap; }
  .seg-btn { flex: 1; min-width: 100px; padding: 10px 12px; border: 1.5px solid var(--border); border-radius: 8px; background: white; font-size: 0.85rem; font-weight: 600; cursor: pointer; text-align: center; color: var(--text); }
  .seg-btn.active { background: var(--brand); color: white; border-color: var(--brand); }
  .btn { background: var(--brand); color: white; border: none; border-radius: 8px; padding: 14px 28px; font-size: 1rem; font-weight: 600; cursor: pointer; width: 100%; margin-top: 8px; }
  .btn:hover { background: var(--brand-dark); }
  .results { background: var(--brand-light); border-radius: var(--radius); padding: 24px; margin-top: 24px; display: none; }
  .results.show { display: block; }
  .result-hero { text-align: center; padding: 12px 0 20px; }
  .result-hero .value { font-size: 2.2rem; font-weight: 800; color: var(--brand); }
  .result-hero .label { font-size: 0.85rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
  .band-breakdown { background: white; border-radius: 8px; padding: 14px 16px; margin-top: 12px; font-size: 0.85rem; }
  .band-breakdown div { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid var(--border); }
  .band-breakdown div:last-child { border-bottom: none; font-weight: 700; }
  .content { max-width: 760px; margin: 0 auto; padding: 0 20px 60px; }
  h2 { font-size: 1.4rem; font-weight: 700; margin: 40px 0 14px; }
  p { color: #374151; margin-bottom: 14px; font-size: 0.95rem; }
  .table-wrap { overflow-x: auto; margin: 20px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
  th { background: var(--brand); color: white; padding: 10px 12px; text-align: left; white-space: nowrap; }
  td { padding: 9px 12px; border-bottom: 1px solid var(--border); white-space: nowrap; }
  tr:nth-child(even) td { background: #f8fafc; }
  .year-nav { display: flex; gap: 10px; margin: 20px 0 40px; flex-wrap: wrap; }
  .year-link { flex: 1; min-width: 140px; text-align: center; background: white; border: 1.5px solid var(--border); border-radius: 8px; padding: 12px; text-decoration: none; color: var(--text); font-weight: 700; }
  .year-link.current { background: var(--brand); color: white; border-color: var(--brand); }
  .year-link:hover { border-color: var(--brand); }
  .sat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0 40px; }
  @media (max-width: 500px) { .sat-grid { grid-template-columns: 1fr; } }
  .sat-link { display: block; background: white; border: 1.5px solid var(--border); border-radius: 10px; padding: 16px 18px; text-decoration: none; color: var(--text); }
  .sat-link:hover { border-color: var(--brand); }
  .sat-link .t { font-weight: 700; font-size: 0.95rem; margin-bottom: 3px; }
  .sat-link .d { font-size: 0.8rem; color: var(--muted); }
  .cta-box { background: #111827; color: white; border-radius: var(--radius); padding: 36px 32px; margin: 40px 0; }
  .cta-box h2 { color: white; margin-top: 0; font-size: 1.35rem; }
  .cta-box p { color: rgba(255,255,255,0.88); }
  .cta-box li { color: rgba(255,255,255,0.82) !important; }
  .cta-btn { display: inline-block; background: var(--accent); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 700; font-size: 1rem; margin-top: 20px; }
  .faq { margin: 40px 0; }
  .faq-item { border: 1px solid var(--border); border-radius: 8px; margin-bottom: 10px; overflow: hidden; }
  .faq-q { padding: 16px 20px; font-weight: 600; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-size: 0.95rem; background: white; }
  .faq-q:hover { background: var(--brand-light); }
  .faq-q::after { content: '+'; font-size: 1.2rem; color: var(--brand); flex-shrink: 0; }
  .faq-q.open::after { content: '−'; }
  .faq-a { display: none; padding: 0 20px 16px; font-size: 0.9rem; color: #374151; background: white; }
  .faq-a.show { display: block; }
  footer { background: var(--brand-dark); color: rgba(255,255,255,0.6); text-align: center; padding: 28px 20px; font-size: 0.8rem; }
  footer a { color: rgba(255,255,255,0.7); }
  .eeat-section { background: white; border: 1px solid var(--border); border-radius: var(--radius); padding: 28px; margin: 32px 0; }
  .eeat-title { font-size: 1.2rem; font-weight: 800; margin-bottom: 20px; border-bottom: 2px solid var(--brand-light); padding-bottom: 12px; }
  .eeat-compliance-item { margin-bottom: 14px; font-size: 0.85rem; color: var(--muted); }
  .eeat-compliance-item a { color: var(--brand); }
  .caveat-box { background: #fffbeb; border: 1.5px solid #fde68a; border-radius: 8px; padding: 14px 18px; margin: 20px 0; font-size: 0.88rem; color: #78350f; }
`;

function fmt(n) { return '£' + Math.round(n).toLocaleString('en-GB'); }
function faqHtml(faqs) {
  return `<div class="faq"><h2>Frequently Asked Questions</h2>` +
    faqs.map(f => `<div class="faq-item"><div class="faq-q" onclick="toggleFaq(this)">${f.q}</div><div class="faq-a">${f.a}</div></div>`).join('\n') + `</div>`;
}
function faqJsonLd(faqs) { return faqs.map(f => ({ "@type": "Question", "name": f.q, "acceptedAnswer": { "@type": "Answer", "text": f.a.replace(/<[^>]+>/g, '') } })); }

function yearNavHtml(current) {
  return YEARS.map(y => y.slug === current
    ? `<span class="year-link current">${y.label}</span>`
    : `<a class="year-link" href="/${y.slug}/">${y.label}</a>`).join('\n') +
    `<a class="year-link" href="/">2026/27 (current)</a>`;
}

function buildPage(y) {
  const exampleGross = 35000;
  const restUkIt = restUkTax(exampleGross);
  const scotIt = scotlandTax(exampleGross, y.scotland);
  const niAmt = ni(exampleGross, y.niRate);
  const netRestUk = exampleGross - restUkIt - niAmt;
  const netScot = exampleGross - scotIt - niAmt;

  const canonical = `${SITE_URL}/${y.slug}/`;
  const title = `UK Tax Calculator ${y.label}`;
  const metaTitle = `UK Tax Calculator ${y.label} — Historical Income Tax & NI Rates`;
  const metaDesc = `Calculate UK take-home pay using ${y.label} Income Tax and National Insurance rates — for checking historical payslips, P60s, or past-year figures. England, Scotland, Wales & NI.`;

  const faqs = [
    { q: `What were the Income Tax rates in ${y.label}?`, a: `England, Wales and Northern Ireland used the same bands as 2026/27: £12,570 tax-free Personal Allowance, then 20% up to £50,270, 40% up to £125,140, and 45% above — these bands have been frozen since 2021/22. Scotland used its own bands (see table above).` },
    { q: `What was the National Insurance rate in ${y.label}?`, a: y.niNote },
    { q: `Why would I need ${y.label} tax rates instead of the current year?`, a: `Common reasons: checking an old payslip or P60 for accuracy, working out backdated pay or a tribunal settlement, comparing your pay rise year-on-year, or verifying HMRC correspondence about a previous tax year.` },
    { q: `Can I still file or amend a ${y.label} Self Assessment return?`, a: `HMRC generally allows amendments to a Self Assessment return up to 12 months after the filing deadline for that year — check gov.uk/self-assessment-tax-returns/corrections for current rules, as deadlines vary by circumstance.` }
  ];

  const toolHtml = `
  <div class="input-group"><label>Annual Gross Salary (£)</label><input type="number" id="salary" min="0" step="500" value="35000"></div>
  <div class="input-group"><label>Region</label>
    <div class="seg-row" id="regionSeg">
      <div class="seg-btn active" data-val="rest_uk">England / Wales / NI</div>
      <div class="seg-btn" data-val="scotland">Scotland</div>
    </div>
  </div>
  <button class="btn" onclick="calculate()">Calculate ${y.label} Take-Home Pay →</button>
  <div class="results" id="results">
    <div class="result-hero"><div class="value" id="r-takehome">—</div><div class="label">Annual Take-Home Pay, ${y.label}</div></div>
    <div class="band-breakdown">
      <div><span>Income Tax</span><span id="r-it">—</span></div>
      <div><span>National Insurance</span><span id="r-ni">—</span></div>
      <div><span>Take-Home Pay</span><span id="r-total">—</span></div>
    </div>
  </div>`;

  const scotBandsJs = JSON.stringify(y.scotland.map(b => [b[0], b[1] === Infinity ? null : b[1], b[2]]));
  const toolJs = `
const NI_RATE=${y.niRate};
const SCOT_BANDS=${scotBandsJs}.map(b=>[b[0], b[1]===null?Infinity:b[1], b[2]]);
function bandedTax(income, bands){let tax=0;for(const [lo,hi,rate] of bands){if(income>lo) tax+=(Math.min(income,hi)-lo)*rate;} return tax;}
function personalAllowance(income){ if(income<=100000) return 12570; return Math.max(0,12570-(income-100000)/2); }
function restUkTax(taxable){ const pa=personalAllowance(taxable); return bandedTax(taxable,[[0,pa,0],[pa,50270,0.20],[50270,125140,0.40],[125140,Infinity,0.45]]); }
function scotlandTax(taxable){ const pa=personalAllowance(taxable); const adjusted=SCOT_BANDS.map((b,i)=>i===1?[pa,b[1],b[2]]:b); return bandedTax(taxable,adjusted); }
function nationalInsurance(gross){ return bandedTax(gross,[[0,12570,0],[12570,50270,NI_RATE],[50270,Infinity,0.02]]); }
document.querySelectorAll('#regionSeg .seg-btn').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('#regionSeg .seg-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');}));
function calculate(){
  const gross=parseFloat(document.getElementById('salary').value)||0;
  const region=document.querySelector('#regionSeg .seg-btn.active').dataset.val==='scotland'?'scotland':'rest_uk';
  const it = region==='scotland' ? scotlandTax(gross) : restUkTax(gross);
  const ni = nationalInsurance(gross);
  const takeHome = gross-it-ni;
  document.getElementById('r-takehome').textContent=fmt(takeHome);
  document.getElementById('r-it').textContent=fmt(it);
  document.getElementById('r-ni').textContent=fmt(ni);
  document.getElementById('r-total').textContent=fmt(takeHome);
  document.getElementById('results').classList.add('show');
}`;

  const scotTableRows = y.scotland.map(([lo, hi, rate]) => `<tr><td>${hi === Infinity ? `Above £${lo.toLocaleString('en-GB')}` : `£${lo.toLocaleString('en-GB')} – £${hi.toLocaleString('en-GB')}`}</td><td>${(rate * 100).toFixed(0)}%</td></tr>`).join('\n');

  const extraContent = `
  <h2>${y.label} Income Tax Bands</h2>
  <h3>England, Wales &amp; Northern Ireland</h3>
  <div class="table-wrap"><table><tr><th>Band</th><th>Rate</th></tr>
  <tr><td>Up to £12,570 (Personal Allowance)</td><td>0%</td></tr>
  <tr><td>£12,571 – £50,270</td><td>20%</td></tr>
  <tr><td>£50,271 – £125,140</td><td>40%</td></tr>
  <tr><td>Above £125,140</td><td>45%</td></tr>
  </table></div>
  <h3>Scotland</h3>
  <div class="table-wrap"><table><tr><th>Band</th><th>Rate</th></tr>${scotTableRows}</table></div>

  <h2>${y.label} National Insurance</h2>
  <div class="caveat-box">${y.niNote}</div>
  <div class="table-wrap"><table><tr><th>Band</th><th>Rate</th></tr>
  <tr><td>Up to £12,570</td><td>0%</td></tr>
  <tr><td>£12,571 – £50,270</td><td>${(y.niRate * 100).toFixed(1)}%${y.slug.includes('2023') ? ' (blended annual average)' : ''}</td></tr>
  <tr><td>Above £50,270</td><td>2%</td></tr>
  </table></div>

  <h2>Worked Example — £${exampleGross.toLocaleString('en-GB')} Salary in ${y.label}</h2>
  <div class="table-wrap"><table><tr><th>Region</th><th>Income Tax</th><th>National Insurance</th><th>Take-Home Pay</th></tr>
  <tr><td>England, Wales, Northern Ireland</td><td>${fmt(restUkIt)}</td><td>${fmt(niAmt)}</td><td><strong>${fmt(netRestUk)}</strong></td></tr>
  <tr><td>Scotland</td><td>${fmt(scotIt)}</td><td>${fmt(niAmt)}</td><td><strong>${fmt(netScot)}</strong></td></tr>
  </table></div>

  <h2>Browse Other Tax Years</h2>
  <div class="year-nav">${yearNavHtml(y.slug)}</div>`;

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
  <div class="flag">🇬🇧 UK Payroll · Historical Rates</div>
  <h1>${title}</h1>
  <p>Calculate take-home pay using ${y.label} Income Tax and National Insurance rates — for checking old payslips, P60s or backdated pay.</p>
</header>
<div class="tool-card">${toolHtml}</div>
<div class="content">
  ${extraContent}
  <h2>Explore More Payroll Calculators</h2>
  <div class="sat-grid">
    <a class="sat-link" href="/"><div class="t">Take-Home Pay Calculator (2026/27)</div><div class="d">Current rates, full breakdown</div></a>
    <a class="sat-link" href="/salary-after-tax/"><div class="t">Salary After Tax — Browse by Amount</div><div class="d">£15,000 to £150,000</div></a>
    <a class="sat-link" href="/required-salary-calculator/"><div class="t">Required Salary Calculator</div><div class="d">Gross needed for a target take-home</div></a>
    <a class="sat-link" href="/compare-two-salaries-calculator/"><div class="t">Compare Two Salaries</div><div class="d">Job offer take-home pay, side by side</div></a>
  </div>
  <div class="cta-box">
    <h2>Need Your Exact ${y.label} Figures Verified?</h2>
    <p>This calculator gives a reliable estimate using published rates — for a definitive check against your specific tax code, benefits-in-kind or multiple income sources, an accountant or HMRC's own tools are the authoritative source.</p>
    <a href="https://www.gov.uk/estimate-income-tax" class="cta-btn" target="_blank" rel="noopener">Check on gov.uk →</a>
  </div>
  <div class="eeat-section">
    <h2 class="eeat-title">Transparency &amp; Sources</h2>
    <div class="eeat-compliance-item">Scottish bands sourced from ${y.source}. Rest-of-UK bands and NI thresholds from HMRC / House of Commons Library rates and allowances briefings. <a href="https://www.gov.uk/estimate-income-tax" target="_blank" rel="noopener">Verify on gov.uk</a>.</div>
    <div class="eeat-compliance-item">Formulas are public — inspect on <a href="https://github.com/sadiyaqeen92639572-cloud/uk-take-home-pay-calculator" target="_blank" rel="noopener">GitHub</a>.</div>
  </div>
  ${faqHtml(faqs)}
</div>
<footer>
  <p>Information only — not tax or legal advice. Historical rates shown for ${y.label}; for current-year figures use the <a href="/">main calculator</a>.</p>
</footer>
<script>
function fmt(n) { return '£' + Math.round(n).toLocaleString('en-GB'); }
function toggleFaq(el) { el.classList.toggle('open'); el.nextElementSibling.classList.toggle('show'); }
${toolJs}
</script>
</body>
</html>`;
}

for (const y of YEARS) {
  const dir = path.join(__dirname, y.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), buildPage(y));
  console.log('Wrote', y.slug + '/index.html');
}

const urls = YEARS.map(y => `${SITE_URL}/${y.slug}/`);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(u => `  <url><loc>${u}</loc><changefreq>yearly</changefreq><priority>0.6</priority></url>`).join('\n') +
  `\n</urlset>\n`;
fs.writeFileSync(path.join(__dirname, 'sitemap-years.xml'), sitemap);
console.log('Wrote sitemap-years.xml with', urls.length, 'URLs');
