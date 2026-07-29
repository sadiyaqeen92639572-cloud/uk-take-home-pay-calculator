// Generates NHS Agenda for Change pay-band pages (2026/27) — Band 2 through 9.
// Source: NHS Employers official pay circular, effective 1 April 2026, 3.3% uplift.
const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://mynetsalary.co.uk';
const GSC_TAG = 'F0g9xdQ9RU5cTssBiWtkj41-7q2_kIwcKbJc_sMTthQ';
const PT = 12570, UEL = 50270;

const BANDS = [
  { slug: 'nhs-band-2-pay', band: '2', points: [{ label: 'Single rate', pay: 25272 }], desc: 'Healthcare assistants, domestic and catering staff, porters' },
  { slug: 'nhs-band-3-pay', band: '3', points: [{ label: 'Entry', pay: 25760 }, { label: 'Top', pay: 27476 }], desc: 'Senior healthcare assistants, clinical support workers, administrative officers' },
  { slug: 'nhs-band-4-pay', band: '4', points: [{ label: 'Entry', pay: 28392 }, { label: 'Top', pay: 31157 }], desc: 'Assistant practitioners, senior administrative staff, associate practitioners' },
  { slug: 'nhs-band-5-pay', band: '5', points: [{ label: 'Entry', pay: 32073 }, { label: 'Intermediate', pay: 34592 }, { label: 'Top', pay: 39043 }], desc: 'Newly qualified nurses, physiotherapists, occupational therapists, radiographers' },
  { slug: 'nhs-band-6-pay', band: '6', points: [{ label: 'Entry', pay: 39959 }, { label: 'Intermediate', pay: 42170 }, { label: 'Top', pay: 48117 }], desc: 'Senior staff nurses, specialist practitioners, senior therapists' },
  { slug: 'nhs-band-7-pay', band: '7', points: [{ label: 'Entry', pay: 49387 }, { label: 'Intermediate', pay: 51932 }, { label: 'Top', pay: 56515 }], desc: 'Advanced nurse practitioners, team leaders, senior specialist staff' },
  { slug: 'nhs-band-8a-pay', band: '8a', points: [{ label: 'Entry', pay: 57528 }, { label: 'Intermediate', pay: 60417 }, { label: 'Top', pay: 64750 }], desc: 'Senior managers, consultant-level allied health professionals' },
  { slug: 'nhs-band-8b-pay', band: '8b', points: [{ label: 'Entry', pay: 66582 }, { label: 'Intermediate', pay: 70896 }, { label: 'Top', pay: 77368 }], desc: 'Senior operational managers, principal clinical specialists' },
  { slug: 'nhs-band-8c-pay', band: '8c', points: [{ label: 'Entry', pay: 79504 }, { label: 'Intermediate', pay: 84346 }, { label: 'Top', pay: 91609 }], desc: 'Heads of service, senior clinical leads' },
  { slug: 'nhs-band-8d-pay', band: '8d', points: [{ label: 'Entry', pay: 94356 }, { label: 'Intermediate', pay: 100140 }, { label: 'Top', pay: 108814 }], desc: 'Associate directors, deputy directors' },
  { slug: 'nhs-band-9-pay', band: '9', points: [{ label: 'Entry', pay: 112782 }, { label: 'Intermediate', pay: 119583 }, { label: 'Top', pay: 129783 }], desc: 'Directors and the most senior NHS leadership roles' }
];

function bandedTax(income, bands) { let tax = 0; for (const [lo, hi, rate] of bands) { if (income > lo) tax += (Math.min(income, hi) - lo) * rate; } return tax; }
function personalAllowance(income) { if (income <= 100000) return 12570; return Math.max(0, 12570 - (income - 100000) / 2); }
function incomeTax(taxable, region) {
  const pa = personalAllowance(taxable);
  if (region === 'scotland') return bandedTax(taxable, [[0, pa, 0], [pa, 16537, 0.19], [16537, 29526, 0.20], [29526, 43662, 0.21], [43662, 75000, 0.42], [75000, 125140, 0.45], [125140, Infinity, 0.48]]);
  return bandedTax(taxable, [[0, pa, 0], [pa, 50270, 0.20], [50270, 125140, 0.40], [125140, Infinity, 0.45]]);
}
function nationalInsurance(gross) { return bandedTax(gross, [[0, PT, 0], [PT, UEL, 0.08], [UEL, Infinity, 0.02]]); }
function net(gross, region) { const it = incomeTax(gross, region); const ni = nationalInsurance(gross); return { it, ni, net: gross - it - ni }; }
function fmt(n) { return '£' + Math.round(n).toLocaleString('en-GB'); }

const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root { --brand: #1e5fae; --brand-dark: #123e73; --brand-light: #e7f0fb; --accent: #b91c1c; --text: #1a1a2e; --muted: #64748b; --border: #e2e8f0; --radius: 12px; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: var(--text); background: #f8fafc; line-height: 1.6; }
  header { background: linear-gradient(135deg, var(--brand) 0%, var(--brand-dark) 100%); color: white; padding: 48px 20px 80px; text-align: center; }
  header p { color: rgba(255,255,255,0.88); font-size: 1.05rem; margin-top: 10px; max-width: 640px; margin-left: auto; margin-right: auto; }
  h1 { font-size: clamp(1.5rem, 4vw, 2.3rem); font-weight: 800; letter-spacing: -0.5px; }
  .flag { font-size: 0.85rem; background: rgba(255,255,255,0.15); border-radius: 20px; padding: 4px 14px; display: inline-block; margin-bottom: 16px; letter-spacing: 1px; }
  .tool-card { background: white; border-radius: var(--radius); box-shadow: 0 4px 32px rgba(0,0,0,0.10); margin: -48px auto 40px; max-width: 720px; padding: 36px 32px; position: relative; z-index: 10; }
  .input-group { margin-bottom: 20px; }
  .input-group label { display: block; font-weight: 600; font-size: 0.9rem; margin-bottom: 6px; }
  select, input[type=number] { width: 100%; padding: 10px 14px; border: 1.5px solid var(--border); border-radius: 8px; font-size: 1rem; background: white; }
  .seg-row { display: flex; gap: 8px; flex-wrap: wrap; }
  .seg-btn { flex: 1; min-width: 100px; padding: 10px 12px; border: 1.5px solid var(--border); border-radius: 8px; background: white; font-size: 0.85rem; font-weight: 600; cursor: pointer; text-align: center; }
  .seg-btn.active { background: var(--brand); color: white; border-color: var(--brand); }
  .btn { background: var(--brand); color: white; border: none; border-radius: 8px; padding: 14px 28px; font-size: 1rem; font-weight: 600; cursor: pointer; width: 100%; margin-top: 8px; }
  .btn:hover { background: var(--brand-dark); }
  .results { background: var(--brand-light); border-radius: var(--radius); padding: 24px; margin-top: 24px; }
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
  .band-nav { display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 10px; margin: 16px 0 40px; }
  .band-link { display: block; background: white; border: 1.5px solid var(--border); border-radius: 8px; padding: 10px; text-align: center; text-decoration: none; color: var(--text); font-weight: 700; font-size: 0.9rem; }
  .band-link.current { background: var(--brand); color: white; border-color: var(--brand); }
  .band-link:hover { border-color: var(--brand); }
  .sat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0 40px; }
  @media (max-width: 500px) { .sat-grid { grid-template-columns: 1fr; } }
  .sat-link { display: block; background: white; border: 1.5px solid var(--border); border-radius: 10px; padding: 16px 18px; text-decoration: none; color: var(--text); }
  .sat-link:hover { border-color: var(--brand); }
  .sat-link .t { font-weight: 700; font-size: 0.95rem; margin-bottom: 3px; }
  .sat-link .d { font-size: 0.8rem; color: var(--muted); }
  .cta-box { background: #111827; color: white; border-radius: var(--radius); padding: 36px 32px; margin: 40px 0; }
  .cta-box h2 { color: white; margin-top: 0; font-size: 1.35rem; }
  .cta-box p { color: rgba(255,255,255,0.88); }
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
  .eeat-section { background: white; border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; margin: 32px 0; font-size: 0.85rem; color: var(--muted); }
  .eeat-section a { color: var(--brand); }
`;

function faqHtml(faqs) { return `<div class="faq"><h2>Frequently Asked Questions</h2>` + faqs.map(f => `<div class="faq-item"><div class="faq-q" onclick="toggleFaq(this)">${f.q}</div><div class="faq-a">${f.a}</div></div>`).join('\n') + `</div>`; }
function faqJsonLd(faqs) { return faqs.map(f => ({ "@type": "Question", "name": f.q, "acceptedAnswer": { "@type": "Answer", "text": f.a.replace(/<[^>]+>/g, '') } })); }
function bandNavHtml(current) {
  return BANDS.map(b => b.slug === current ? `<span class="band-link current">Band ${b.band}</span>` : `<a class="band-link" href="/${b.slug}/">Band ${b.band}</a>`).join('\n');
}

function pageHtml(b) {
  const top = b.points[b.points.length - 1].pay;
  const entry = b.points[0].pay;
  const topNet = net(top, 'rest_uk');
  const entryNet = net(entry, 'rest_uk');
  const topNetScot = net(top, 'scotland');
  const canonical = `${SITE_URL}/${b.slug}/`;
  const title = `NHS Band ${b.band} Pay 2026/27`;
  const metaTitle = `NHS Band ${b.band} Pay 2026/27 — Salary & Take-Home Pay`;
  const metaDesc = `NHS Band ${b.band} pay 2026/27: £${entry.toLocaleString('en-GB')}${b.points.length > 1 ? ` to £${top.toLocaleString('en-GB')}` : ''} gross. Take-home pay after tax and NI at every pay point, England, Wales, NI & Scotland.`;

  const pointsRows = b.points.map(p => {
    const n = net(p.pay, 'rest_uk');
    return `<tr><td>${p.label}</td><td>${fmt(p.pay)}</td><td>${fmt(n.it)}</td><td>${fmt(n.ni)}</td><td><strong>${fmt(n.net)}</strong></td><td>${fmt(n.net / 12)}</td></tr>`;
  }).join('\n');

  const toolOptions = b.points.map((p, i) => `<option value="${i}"${i === b.points.length - 1 ? ' selected' : ''}>${p.label} — ${fmt(p.pay)}</option>`).join('\n');

  const faqs = [
    { q: `How much does NHS Band ${b.band} pay in 2026/27?`, a: b.points.length > 1
        ? `NHS Band ${b.band} ranges from ${fmt(entry)} a year at the entry point to ${fmt(top)} at the top of the band, under the 2026/27 Agenda for Change pay scale (3.3% uplift from 1 April 2026).`
        : `NHS Band ${b.band} is a single-rate band, paid at ${fmt(entry)} a year under the 2026/27 Agenda for Change pay scale.` },
    { q: `What is the take-home pay for NHS Band ${b.band}?`, a: `At the top of Band ${b.band} (${fmt(top)} gross), take-home pay is ${fmt(topNet.net)} a year (${fmt(topNet.net / 12)} a month) in England, Wales and Northern Ireland, after ${fmt(topNet.it)} Income Tax and ${fmt(topNet.ni)} National Insurance. In Scotland, take-home is ${fmt(topNetScot.net)} due to different Income Tax bands.` },
    { q: `What roles are in NHS Band ${b.band}?`, a: `${b.desc}. Exact job titles vary by trust and role profile — check your trust's job description against the NHS Job Evaluation Scheme for a definitive banding.` },
    { q: `Does NHS Band ${b.band} pay include unsocial hours or overtime?`, a: `No — these figures are basic Agenda for Change pay only. Unsocial hours enhancements, overtime, high-cost area supplements (London weighting) and on-call payments are calculated separately and added on top of basic pay.` }
  ];

  const toolJs = `
const POINTS=${JSON.stringify(b.points)};
const PT=12570, UEL=50270;
function bandedTax(income, bands){let tax=0;for(const [lo,hi,rate] of bands){if(income>lo) tax+=(Math.min(income,hi)-lo)*rate;} return tax;}
function personalAllowance(income){ if(income<=100000) return 12570; return Math.max(0,12570-(income-100000)/2); }
function incomeTax(taxable, region){
  const pa = personalAllowance(taxable);
  if (region==='scotland') return bandedTax(taxable,[[0,pa,0],[pa,16537,0.19],[16537,29526,0.20],[29526,43662,0.21],[43662,75000,0.42],[75000,125140,0.45],[125140,Infinity,0.48]]);
  return bandedTax(taxable,[[0,pa,0],[pa,50270,0.20],[50270,125140,0.40],[125140,Infinity,0.45]]);
}
function nationalInsurance(gross){ return bandedTax(gross,[[0,PT,0],[PT,UEL,0.08],[UEL,Infinity,0.02]]); }
function calculate(){
  const idx=parseInt(document.getElementById('point').value);
  const gross=POINTS[idx].pay;
  const region=document.querySelector('#regionSeg .seg-btn.active').dataset.val==='scotland'?'scotland':'rest_uk';
  const it=incomeTax(gross,region), ni=nationalInsurance(gross), takeHome=gross-it-ni;
  document.getElementById('r-takehome').textContent=fmt(takeHome);
  document.getElementById('r-monthly').textContent=fmt(takeHome/12);
  document.getElementById('r-it').textContent=fmt(it);
  document.getElementById('r-ni').textContent=fmt(ni);
  document.getElementById('r-total').textContent=fmt(takeHome);
}
document.querySelectorAll('#regionSeg .seg-btn').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('#regionSeg .seg-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');calculate();}));
document.getElementById('point').addEventListener('change',calculate);
calculate();`;

  const toolHtml = `
  <div class="input-group"><label>Pay Point</label>
    <select id="point">${toolOptions}</select>
  </div>
  <div class="input-group"><label>Region</label>
    <div class="seg-row" id="regionSeg">
      <div class="seg-btn active" data-val="rest_uk">England / Wales / NI</div>
      <div class="seg-btn" data-val="scotland">Scotland</div>
    </div>
  </div>
  <div class="results" id="results">
    <div class="result-hero"><div class="value" id="r-takehome">—</div><div class="label">Annual Take-Home Pay</div></div>
    <div class="band-breakdown">
      <div><span>Monthly</span><span id="r-monthly">—</span></div>
      <div><span>Income Tax</span><span id="r-it">—</span></div>
      <div><span>National Insurance</span><span id="r-ni">—</span></div>
      <div><span>Take-Home Pay</span><span id="r-total">—</span></div>
    </div>
  </div>`;

  const extraContent = `
  <h2>NHS Band ${b.band} — Full Pay Point Breakdown 2026/27</h2>
  <p>${b.desc}.</p>
  <div class="table-wrap"><table>
  <tr><th>Point</th><th>Gross</th><th>Income Tax</th><th>National Insurance</th><th>Take-Home /yr</th><th>Take-Home /mo</th></tr>
  ${pointsRows}
  </table></div>
  <p>Figures use England, Wales &amp; Northern Ireland Income Tax bands and 2026/27 rates, basic pay only — before any unsocial hours enhancement, overtime or High Cost Area Supplement (London weighting).</p>

  <h2>Browse Other NHS Bands</h2>
  <div class="band-nav">${bandNavHtml(b.slug)}</div>`;

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
    { "@type": "BreadcrumbList", "itemListElement": [ { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL + "/" }, { "@type": "ListItem", "position": 2, "name": "NHS Pay Bands", "item": SITE_URL + "/nhs-pay-bands/" }, { "@type": "ListItem", "position": 3, "name": title, "item": canonical } ] }
  ]
}, null, 2)}
</script>
<style>${CSS}</style>
</head>
<body>
<header>
  <div class="flag">🇬🇧 Agenda for Change · 2026/27</div>
  <h1>${title}</h1>
  <p>NHS Band ${b.band} ${b.points.length > 1 ? `ranges from ${fmt(entry)} to ${fmt(top)}` : `is paid at ${fmt(entry)}`} — see take-home pay at every point.</p>
</header>
<div class="tool-card">${toolHtml}</div>
<div class="content">
  ${extraContent}
  <h2>Explore More Payroll Calculators</h2>
  <div class="sat-grid">
    <a class="sat-link" href="/"><div class="t">Take-Home Pay Calculator</div><div class="d">Any salary, full breakdown</div></a>
    <a class="sat-link" href="/nhs-pay-bands/"><div class="t">All NHS Pay Bands</div><div class="d">Band 2 to Band 9</div></a>
    <a class="sat-link" href="/pension-contribution-calculator/"><div class="t">Pension Contribution Calculator</div><div class="d">NHS Pension scheme contributions vary by band</div></a>
    <a class="sat-link" href="/compare-two-salaries-calculator/"><div class="t">Compare Two Salaries</div><div class="d">Comparing a promotion or trust move</div></a>
  </div>
  <div class="cta-box">
    <h2>Moving Bands or Trusts?</h2>
    <p>A promotion or trust move often comes with a pay-point reset, different unsocial hours pattern, or NHS Pension contribution tier change — worth checking the real take-home difference before deciding.</p>
    <a href="/compare-two-salaries-calculator/" class="cta-btn">Compare Two Salaries →</a>
  </div>
  <div class="eeat-section">Pay scale sourced from the NHS Employers 2026/27 Agenda for Change pay circular (3.3% uplift, effective 1 April 2026). Tax and NI calculated using published 2026/27 HMRC rates — not an official NHS or HMRC tool. Verify at <a href="https://www.nhsemployers.org" target="_blank" rel="noopener">nhsemployers.org</a> or <a href="https://www.gov.uk/estimate-income-tax" target="_blank" rel="noopener">gov.uk/estimate-income-tax</a>.</div>
  ${faqHtml(faqs)}
</div>
<footer><p>Information only — not official NHS Employers or HMRC guidance. Basic pay only, excludes enhancements.</p></footer>
<script>
function fmt(n) { return '£' + Math.round(n).toLocaleString('en-GB'); }
function toggleFaq(el) { el.classList.toggle('open'); el.nextElementSibling.classList.toggle('show'); }
${toolJs}
</script>
</body>
</html>`;
}

function hubHtml() {
  const canonical = `${SITE_URL}/nhs-pay-bands/`;
  const metaTitle = `NHS Pay Bands 2026/27 — Agenda for Change, All Bands | mynetsalary.co.uk`;
  const metaDesc = `NHS Agenda for Change pay bands 2026/27 — Band 2 to Band 9. Gross salary and take-home pay after tax for every band and pay point.`;
  const rows = BANDS.map(b => {
    const top = b.points[b.points.length - 1].pay, entry = b.points[0].pay;
    return `<tr><td><a href="/${b.slug}/">Band ${b.band}</a></td><td>${b.points.length > 1 ? `${fmt(entry)} – ${fmt(top)}` : fmt(entry)}</td><td>${b.desc}</td></tr>`;
  }).join('\n');
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
<meta name="google-site-verification" content="${GSC_TAG}" />
<style>${CSS}</style>
</head>
<body>
<header>
  <div class="flag">🇬🇧 Agenda for Change · 2026/27</div>
  <h1>NHS Pay Bands 2026/27</h1>
  <p>Every Agenda for Change band, Band 2 to Band 9, with gross pay ranges and links to full take-home pay breakdowns.</p>
</header>
<div class="content" style="margin-top:40px;">
  <div class="table-wrap"><table><tr><th>Band</th><th>Gross Range (2026/27)</th><th>Typical Roles</th></tr>${rows}</table></div>
  <p style="margin-top:20px;">Figures are basic Agenda for Change pay (3.3% uplift, effective 1 April 2026), sourced from NHS Employers. Excludes unsocial hours enhancements, overtime and High Cost Area Supplements. Doctors, dentists and very senior manager (VSM) roles are on separate contracts, not Agenda for Change.</p>
</div>
<footer><p>Information only — not official NHS Employers guidance.</p></footer>
</body>
</html>`;
}

for (const b of BANDS) {
  const dir = path.join(__dirname, b.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), pageHtml(b));
}
console.log('Wrote', BANDS.length, 'NHS band pages');

const hubDir = path.join(__dirname, 'nhs-pay-bands');
fs.mkdirSync(hubDir, { recursive: true });
fs.writeFileSync(path.join(hubDir, 'index.html'), hubHtml());
console.log('Wrote nhs-pay-bands/index.html hub');

const urls = [`${SITE_URL}/nhs-pay-bands/`, ...BANDS.map(b => `${SITE_URL}/${b.slug}/`)];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(u => `  <url><loc>${u}</loc><changefreq>yearly</changefreq><priority>0.7</priority></url>`).join('\n') +
  `\n</urlset>\n`;
fs.writeFileSync(path.join(__dirname, 'sitemap-nhs.xml'), sitemap);
console.log('Wrote sitemap-nhs.xml with', urls.length, 'URLs');
