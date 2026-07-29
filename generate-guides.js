// Generates /guides/ blog hub + article pages — authority content for backlinks/E-E-A-T.
const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://mynetsalary.co.uk';
const GSC_TAG = 'F0g9xdQ9RU5cTssBiWtkj41-7q2_kIwcKbJc_sMTthQ';

const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root { --brand: #1e5fae; --brand-dark: #123e73; --brand-light: #e7f0fb; --accent: #b91c1c; --text: #1a1a2e; --muted: #64748b; --border: #e2e8f0; --radius: 12px; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: var(--text); background: #f8fafc; line-height: 1.6; }
  header { background: linear-gradient(135deg, var(--brand) 0%, var(--brand-dark) 100%); color: white; padding: 48px 20px; text-align: center; }
  header p { color: rgba(255,255,255,0.88); font-size: 1.05rem; margin-top: 10px; max-width: 680px; margin-left: auto; margin-right: auto; }
  .flag { font-size: 0.85rem; background: rgba(255,255,255,0.15); border-radius: 20px; padding: 4px 14px; display: inline-block; margin-bottom: 16px; letter-spacing: 1px; }
  h1 { font-size: clamp(1.5rem, 4vw, 2.3rem); font-weight: 800; letter-spacing: -0.5px; }
  .content { max-width: 720px; margin: 0 auto; padding: 40px 20px 60px; }
  h2 { font-size: 1.35rem; font-weight: 700; margin: 34px 0 12px; color: var(--brand-dark); }
  h3 { font-size: 1.05rem; font-weight: 700; margin: 22px 0 8px; }
  p { color: #374151; margin-bottom: 14px; font-size: 0.97rem; }
  ul, ol { padding-left: 22px; margin-bottom: 14px; }
  li { color: #374151; font-size: 0.97rem; margin-bottom: 6px; }
  .table-wrap { overflow-x: auto; margin: 20px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
  th { background: var(--brand); color: white; padding: 10px 12px; text-align: left; white-space: nowrap; }
  td { padding: 9px 12px; border-bottom: 1px solid var(--border); }
  tr:nth-child(even) td { background: #f8fafc; }
  .callout { background: var(--brand-light); border-left: 4px solid var(--brand); border-radius: 6px; padding: 14px 18px; margin: 20px 0; font-size: 0.92rem; }
  .warning { background: #fffbeb; border-left: 4px solid #d97706; border-radius: 6px; padding: 14px 18px; margin: 20px 0; font-size: 0.92rem; color: #78350f; }
  .meta { color: var(--muted); font-size: 0.82rem; margin-bottom: 24px; }
  .guide-card { display: block; background: white; border: 1.5px solid var(--border); border-radius: 10px; padding: 18px 20px; text-decoration: none; color: var(--text); margin-bottom: 14px; }
  .guide-card:hover { border-color: var(--brand); }
  .guide-card .t { font-weight: 700; font-size: 1rem; margin-bottom: 4px; color: var(--brand-dark); }
  .guide-card .d { font-size: 0.85rem; color: var(--muted); }
  .sat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0 40px; }
  @media (max-width: 500px) { .sat-grid { grid-template-columns: 1fr; } }
  .sat-link { display: block; background: white; border: 1.5px solid var(--border); border-radius: 10px; padding: 16px 18px; text-decoration: none; color: var(--text); }
  .sat-link:hover { border-color: var(--brand); }
  .sat-link .t { font-weight: 700; font-size: 0.95rem; margin-bottom: 3px; }
  .sat-link .d { font-size: 0.8rem; color: var(--muted); }
  .cta-box { background: #111827; color: white; border-radius: var(--radius); padding: 30px 28px; margin: 36px 0; }
  .cta-box h2 { color: white; margin-top: 0; font-size: 1.2rem; }
  .cta-box p { color: rgba(255,255,255,0.88); }
  .cta-btn { display: inline-block; background: var(--accent); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 0.95rem; margin-top: 8px; }
  .faq { margin: 36px 0; }
  .faq-item { border: 1px solid var(--border); border-radius: 8px; margin-bottom: 10px; overflow: hidden; }
  .faq-q { padding: 16px 20px; font-weight: 600; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-size: 0.95rem; background: white; }
  .faq-q:hover { background: var(--brand-light); }
  .faq-q::after { content: '+'; font-size: 1.2rem; color: var(--brand); flex-shrink: 0; }
  .faq-q.open::after { content: '−'; }
  .faq-a { display: none; padding: 0 20px 16px; font-size: 0.9rem; color: #374151; background: white; }
  .faq-a.show { display: block; }
  footer { background: var(--brand-dark); color: rgba(255,255,255,0.6); text-align: center; padding: 28px 20px; font-size: 0.8rem; }
  footer a { color: rgba(255,255,255,0.7); }
  .eeat-section { background: white; border: 1px solid var(--border); border-radius: var(--radius); padding: 22px; margin: 30px 0; font-size: 0.85rem; color: var(--muted); }
  .eeat-section a { color: var(--brand); }
`;

function faqHtml(faqs) { return `<div class="faq"><h2>Frequently Asked Questions</h2>` + faqs.map(f => `<div class="faq-item"><div class="faq-q" onclick="toggleFaq(this)">${f.q}</div><div class="faq-a">${f.a}</div></div>`).join('\n') + `</div>`; }
function faqJsonLd(faqs) { return faqs.map(f => ({ "@type": "Question", "name": f.q, "acceptedAnswer": { "@type": "Answer", "text": f.a.replace(/<[^>]+>/g, '') } })); }

const SAT_GRID = `
  <h2>Related Calculators</h2>
  <div class="sat-grid">
    <a class="sat-link" href="/"><div class="t">Take-Home Pay Calculator</div><div class="d">Full salary breakdown</div></a>
    <a class="sat-link" href="/paye-calculator/"><div class="t">PAYE Calculator</div><div class="d">Income Tax & NI breakdown</div></a>
    <a class="sat-link" href="/required-salary-calculator/"><div class="t">Required Salary Calculator</div><div class="d">Gross needed for a target take-home</div></a>
    <a class="sat-link" href="/pension-contribution-calculator/"><div class="t">Pension Contribution Calculator</div><div class="d">Auto-enrolment & salary sacrifice</div></a>
  </div>`;

const GUIDES = [
  {
    slug: 'br-tax-code-explained',
    title: 'BR Tax Code Explained — What It Means and How to Fix It',
    metaDesc: 'BR tax code explained: it means all your income from that job is taxed at 20% with no tax-free Personal Allowance. Why it happens and how to fix it.',
    intro: 'Seeing "BR" on your payslip usually means one thing: you\'re being taxed on every penny from that job, with no tax-free allowance at all.',
    body: `
  <h2>What Does BR Mean?</h2>
  <p>BR stands for <strong>Basic Rate</strong>. Under a BR tax code, HMRC instructs your employer to tax 100% of your income from that job at the 20% basic rate — with no Personal Allowance applied at all, not even the first £12,570 that's normally tax-free.</p>
  <p>It's not a penalty and it doesn't mean you've done anything wrong — it's usually a placeholder code used when HMRC doesn't yet have enough information to issue your correct, personalised tax code.</p>

  <h2>Why Have I Been Given a BR Code?</h2>
  <ul>
    <li><strong>Second job or pension:</strong> the most common reason — HMRC assumes your Personal Allowance is already being used up by your main job, so this one is taxed at BR from the first pound.</li>
    <li><strong>New job, no P45:</strong> if you started a new job without a P45 from your previous employer and didn't complete a starter checklist correctly, your employer may default to BR (or an emergency code) until HMRC catches up.</li>
    <li><strong>HMRC hasn't processed your details yet:</strong> sometimes it's simply a timing gap while your record updates.</li>
  </ul>

  <div class="warning"><strong>Overpaying tax on BR?</strong> If BR has been applied incorrectly — for example, it's actually your only job — you could be paying significantly more Income Tax than you owe.</div>

  <h2>Is BR Always Wrong?</h2>
  <p>No — BR is often <em>correct</em> if it genuinely is a second source of income and your Personal Allowance is fully used against your main job or pension. In that case, taxing the second income at a flat 20% (rather than 0% then 20%) is the right outcome overall, even though it feels like a big chunk of that specific payslip.</p>

  <h2>How to Fix an Incorrect BR Code</h2>
  <ol>
    <li>Check your tax code on your latest payslip or in your <a href="https://www.gov.uk/check-income-tax-current-year" target="_blank" rel="noopener">Personal Tax Account</a> on gov.uk.</li>
    <li>If it's wrong — e.g. this is genuinely your only job — contact HMRC directly (phone or via your Personal Tax Account) to update it.</li>
    <li>Once corrected, HMRC will issue an updated tax code to your employer, and any tax overpaid is usually refunded automatically through your pay, or as a lump sum if the job has ended.</li>
  </ol>

  <h2>Other Common Non-Standard Codes</h2>
  <p>BR isn't the only placeholder or special-case code — see our guides to <a href="/emergency-tax-code-explained/">emergency tax codes</a> and <a href="/k-tax-code-explained/">K codes</a> if your payslip shows something else unfamiliar.</p>`,
    faqs: [
      { q: 'Does BR mean I\'m being taxed too much?', a: 'Not necessarily — BR is correct if this genuinely is a second job or pension and your Personal Allowance is already applied elsewhere. It\'s only wrong if it\'s incorrectly applied to what should be your only source of income.' },
      { q: 'How much extra tax does a BR code cost?', a: 'If BR is wrongly applied to your only job, you lose the full £12,570 tax-free Personal Allowance — costing up to £2,514 a year in extra Income Tax (20% of £12,570) compared to the standard 1257L code.' },
      { q: 'How long does it take to fix a BR tax code?', a: 'Once you contact HMRC and they update your record, your employer usually applies the new code within one or two pay periods, with any overpaid tax refunded through your next payslip.' },
      { q: 'Can I check what my correct tax code should be?', a: 'Yes — check your Personal Tax Account on gov.uk, or use HMRC\'s tax code checking tool, which explains exactly what code you should be on based on your circumstances.' }
    ]
  },
  {
    slug: 'emergency-tax-code-explained',
    title: 'Emergency Tax Code Explained — Why It Happens and How to Get It Fixed',
    metaDesc: 'Emergency tax code explained: what W1, M1 and X mean, why new employees get put on one, and the steps to get overpaid tax refunded.',
    intro: 'Started a new job and your first payslip looks smaller than expected? An emergency tax code is probably why — and it\'s usually fixable within a pay period or two.',
    body: `
  <h2>What Is an Emergency Tax Code?</h2>
  <p>An emergency tax code is a temporary code HMRC or your employer applies when they don't yet have your full tax history — typically shown as <strong>1257 W1</strong>, <strong>1257 M1</strong>, or <strong>1257 X</strong> on your payslip.</p>
  <p>Unlike your normal cumulative tax code (which spreads your £12,570 Personal Allowance evenly across the year and accounts for tax already paid), an emergency code calculates tax on a <strong>non-cumulative</strong> basis — each pay period is treated in isolation, as if it were the first of the year.</p>

  <h2>What Do W1, M1 and X Mean?</h2>
  <div class="table-wrap"><table><tr><th>Suffix</th><th>Meaning</th></tr>
  <tr><td>W1</td><td>Week 1 basis — used if you're paid weekly</td></tr>
  <tr><td>M1</td><td>Month 1 basis — used if you're paid monthly</td></tr>
  <tr><td>X</td><td>Generic marker meaning "non-cumulative," used when the exact basis isn't specified</td></tr>
  </table></div>

  <h2>Why Does This Happen?</h2>
  <ul>
    <li><strong>No P45 provided:</strong> the most common cause — without your previous employer's P45, your new employer doesn't know your year-to-date pay and tax.</li>
    <li><strong>Started mid-year with incomplete starter checklist:</strong> if the starter checklist (which replaced the old P46) wasn't filled in correctly.</li>
    <li><strong>Complex circumstances:</strong> multiple jobs, benefits in kind, or a recent change HMRC hasn't processed yet.</li>
  </ul>

  <h2>Does This Mean I'm Overpaying Tax?</h2>
  <p>Often, yes — especially if you've already used some of your Personal Allowance earlier in the tax year at a previous job. Because an emergency code doesn't account for that, you can end up paying more tax than you actually owe for that pay period.</p>
  <div class="callout">The good news: this usually self-corrects. Once HMRC receives your P45 or processes your starter checklist, they issue your proper cumulative tax code, and any overpayment is refunded automatically through payroll — no separate claim needed in most cases.</div>

  <h2>What Should I Do?</h2>
  <ol>
    <li>Give your new employer your P45 as soon as possible, or complete the starter checklist accurately if you don't have one.</li>
    <li>Check your payslip in the following month or two — the code should update automatically to a standard cumulative code (usually 1257L).</li>
    <li>If it hasn't corrected after 2-3 pay periods, contact HMRC directly via your Personal Tax Account.</li>
  </ol>`,
    faqs: [
      { q: 'Will I get back the extra tax I paid on an emergency code?', a: 'In most cases yes, automatically — once your correct cumulative tax code is applied, any overpayment from earlier in the year is refunded through your payslip, without you needing to claim separately.' },
      { q: 'Is an emergency tax code the same as a BR code?', a: 'No — BR taxes all income at 20% with zero Personal Allowance, while an emergency code (1257 W1/M1/X) still gives you the standard Personal Allowance, just calculated per pay period rather than cumulatively across the year.' },
      { q: 'How long does an emergency tax code usually last?', a: 'Typically one to three pay periods while HMRC processes your P45 or starter checklist — though it can take longer if your situation is more complex (multiple jobs, recent self-employment, etc.).' },
      { q: 'Can I avoid being put on an emergency tax code?', a: 'Providing your P45 to a new employer promptly, or filling in the starter checklist accurately if you don\'t have one, is the best way to avoid or minimise time on an emergency code.' }
    ]
  },
  {
    slug: 'k-tax-code-explained',
    title: 'K Tax Code Explained — When You Owe Tax on More Than You Earn',
    metaDesc: 'K tax code explained: why some tax codes start with K instead of ending in L, what it means for company benefits, and how the deduction is capped.',
    intro: 'Most tax codes give you an allowance. A K code does the opposite — it adds extra taxable income on top of your salary, usually because of company benefits or unpaid tax from a previous year.',
    body: `
  <h2>What Is a K Tax Code?</h2>
  <p>A K code (e.g. <strong>K475</strong>) means you have income or benefits that aren't being taxed elsewhere, and it's large enough to cancel out your Personal Allowance entirely and leave extra taxable income on top. Instead of reducing your taxable pay, a K code <strong>increases</strong> it.</p>
  <p>The number in a K code (475 in the example) represents the amount added to your taxable income, multiplied by 10 — so K475 adds roughly £4,750 to your taxable pay for the year.</p>

  <h2>Why Would I Have a K Code?</h2>
  <ul>
    <li><strong>Company benefits exceeding your Personal Allowance:</strong> a company car, private medical insurance, or other benefit in kind large enough that it uses up the full £12,570 allowance and then some.</li>
    <li><strong>Unpaid tax from a previous year:</strong> HMRC collecting a prior underpayment through your current tax code rather than a one-off bill.</li>
    <li><strong>State Pension plus employment:</strong> if you receive the State Pension (paid gross, without tax deducted) alongside a job, HMRC sometimes uses a K code on your employment income to collect the tax due on your pension.</li>
  </ul>

  <h2>Is There a Limit on How Much Extra Can Be Deducted?</h2>
  <p>Yes — by law, a K code can never take more than <strong>50% of your gross pay</strong> in a single pay period, regardless of how large the code's number is. This "regulatory limit" protects you from an unexpectedly enormous deduction in any one payslip; if the full amount can't be collected, the shortfall carries forward.</p>

  <h2>What Should I Do If I Have a K Code?</h2>
  <ol>
    <li>Check the coding notice HMRC sent explaining the calculation — it should break down exactly which benefit or previous underpayment is driving it.</li>
    <li>Confirm the benefit-in-kind values are accurate (your employer reports these via a P11D) — errors here are a common cause of an incorrect K code.</li>
    <li>If something looks wrong, contact HMRC via your Personal Tax Account to query it.</li>
  </ol>`,
    faqs: [
      { q: 'Does a K tax code mean I owe HMRC money directly?', a: 'No — you don\'t pay HMRC a separate bill. Instead, extra tax is collected automatically through your payslip, spread across the tax year, by adding notional income to what\'s taxed.' },
      { q: 'Can a K code take all of my pay?', a: 'No — by law, deductions from a K code are capped at 50% of your gross pay in any single pay period, so you always take home at least half your gross pay from that job.' },
      { q: 'Why do I have a K code if I don\'t get company benefits?', a: 'It can also result from unpaid tax being collected from a previous year, or from having taxable income (like the State Pension) that isn\'t taxed at source alongside your employment.' },
      { q: 'How do I check if my K code is correct?', a: 'Compare it against your HMRC coding notice, which itemises the benefits or previous underpayment behind the calculation — if the underlying figures (e.g. company car value) look wrong, query them with HMRC.' }
    ]
  },
  {
    slug: '1257l-tax-code-explained',
    title: '1257L Tax Code Explained — The Standard UK Tax Code',
    metaDesc: '1257L tax code explained: what it means, why it\'s the standard code for most employees, and when it might change.',
    intro: 'If your payslip shows 1257L, you\'re on the standard tax code most UK employees have — here\'s exactly what it means.',
    body: `
  <h2>What Does 1257L Mean?</h2>
  <p>1257L is the most common tax code in the UK. The number <strong>1257</strong> represents your tax-free Personal Allowance — £12,570 a year — divided by 10. The letter <strong>L</strong> indicates you're entitled to the standard Personal Allowance with no special adjustments.</p>
  <p>In practice, 1257L means: the first £12,570 you earn each tax year is tax-free, and everything above that is taxed at the normal bands (20% basic rate, 40% higher rate, 45% additional rate in England, Wales and Northern Ireland — different bands apply in Scotland).</p>

  <h2>Who Gets 1257L?</h2>
  <p>Most employees with one job, no company benefits pushing them over the allowance, no untaxed income, and no previous under- or overpayments to correct. It's the default, "nothing unusual going on" code.</p>

  <h2>1257L vs 1257L M1/W1 — What's the Difference?</h2>
  <p>Plain <strong>1257L</strong> is applied cumulatively — your allowance builds up evenly across the tax year, and each payslip accounts for tax already paid so far. <strong>1257L M1</strong> or <strong>1257L W1</strong> (see our <a href="/emergency-tax-code-explained/">emergency tax code guide</a>) applies the same allowance but recalculates each pay period in isolation — usually a temporary state while HMRC catches up on your details.</p>

  <h2>When Would 1257L Change?</h2>
  <ul>
    <li><strong>Company benefits</strong> (car, medical insurance) reduce your allowance, or push you onto a <a href="/k-tax-code-explained/">K code</a> if large enough.</li>
    <li><strong>Income above £100,000</strong> tapers your Personal Allowance by £1 for every £2 earned over that threshold, reducing it to £0 by £125,140.</li>
    <li><strong>Marriage Allowance</strong> transfers shift the code slightly (e.g. to 1131L or 1383L depending on direction).</li>
    <li><strong>Blind Person's Allowance</strong> or other specific reliefs adjust the number.</li>
  </ul>`,
    faqs: [
      { q: 'Is 1257L the same every year?', a: 'It has been the standard code since 2021/22, because the £12,570 Personal Allowance has been frozen since then. It will change if or when the government unfreezes and raises the allowance.' },
      { q: 'What if my code isn\'t 1257L?', a: 'A different code isn\'t automatically wrong — it usually reflects something specific to your situation (a second job, company benefits, high income, or an in-year adjustment). Check our guides to BR, emergency, and K codes for the most common variants.' },
      { q: 'How do I check if 1257L is correct for me?', a: 'If you have one job, no benefits in kind, and earn under £100,000, 1257L is almost certainly right. For anything more complex, check your Personal Tax Account on gov.uk against your actual circumstances.' },
      { q: 'Does 1257L apply in Scotland too?', a: 'Yes — the tax code and Personal Allowance work the same way UK-wide; only the tax bands and rates applied above the allowance differ in Scotland.' }
    ]
  },
  {
    slug: 'salary-sacrifice-explained',
    title: 'Salary Sacrifice Explained — How It Works and When It\'s Worth It',
    metaDesc: 'Salary sacrifice explained: how giving up salary for pension, cycle to work or EV schemes can reduce Income Tax and National Insurance, and when to be cautious.',
    intro: 'Salary sacrifice can quietly make a pension contribution, a new bike, or an electric car meaningfully cheaper — because of how it interacts with tax and National Insurance, not just Income Tax.',
    body: `
  <h2>What Is Salary Sacrifice?</h2>
  <p>Salary sacrifice is an arrangement where you agree to give up part of your salary in exchange for a non-cash benefit — most commonly a pension contribution, but also cycle-to-work schemes, electric car leases, or childcare vouchers (for those still on the older scheme).</p>
  <p>Because the "sacrificed" amount never counts as salary in the first place, it's deducted <strong>before</strong> Income Tax and — crucially — before <strong>National Insurance</strong> too. That second part is what makes it more valuable than simply paying into a pension from your take-home pay.</p>

  <h2>Salary Sacrifice vs a Normal Pension Contribution</h2>
  <div class="table-wrap"><table><tr><th></th><th>Standard net pay pension</th><th>Salary sacrifice pension</th></tr>
  <tr><td>Income Tax relief</td><td>Yes — full relief at your marginal rate</td><td>Yes — same relief</td></tr>
  <tr><td>National Insurance saved</td><td>No</td><td>Yes — you save 8% (or 2% above £50,270), and many employers pass on some or all of their own 15% NI saving too</td></tr>
  </table></div>
  <p>Use our <a href="/pension-contribution-calculator/">pension contribution calculator</a> to see the numbers for your own salary.</p>

  <h2>Common Salary Sacrifice Schemes</h2>
  <ul>
    <li><strong>Workplace pension:</strong> the most common and usually the most valuable, since it combines Income Tax and NI savings with long-term retirement saving.</li>
    <li><strong>Cycle to Work:</strong> spread the cost of a bike (and accessories) over 12 months via salary sacrifice, tax-free up to certain limits.</li>
    <li><strong>Electric car leasing:</strong> currently one of the most generous schemes — very low Benefit in Kind rates on electric vehicles make this substantially cheaper than a normal car lease for many higher earners.</li>
  </ul>

  <div class="warning"><strong>Things to check before signing up:</strong> salary sacrifice reduces your official salary, which can affect mortgage affordability assessments, statutory maternity/paternity pay calculations, and pension contribution caps if you're a high earner. It can also reduce entitlement to income-linked benefits like Tax-Free Childcare if it pushes your "adjusted net income" thresholds.</div>

  <h2>Is It Always Worth Doing?</h2>
  <p>For most people earning above the National Insurance threshold, salary sacrifice for a pension is close to a "free" saving — same pension outcome, lower NI. It's worth being more cautious if you're planning a mortgage application soon (lenders assess affordability on your post-sacrifice salary), or if you're already near income thresholds for benefits or the Personal Allowance taper at £100,000.</p>`,
    faqs: [
      { q: 'Does salary sacrifice reduce my pension contribution?', a: 'No — typically the full sacrificed amount still goes into your pension, exactly as if you\'d paid it from take-home pay. The difference is you (and often your employer) pay less National Insurance getting it there.' },
      { q: 'Can salary sacrifice take me below minimum wage?', a: 'No — by law, salary sacrifice can\'t reduce your pay below the National Minimum or Living Wage. Employers must cap the sacrifice or use an alternative arrangement if it would.' },
      { q: 'Does salary sacrifice affect my mortgage application?', a: 'Yes, potentially — lenders assess affordability based on your contractual salary after sacrifice, which is lower than your headline salary, so it can slightly reduce how much you\'re able to borrow.' },
      { q: 'Is electric car salary sacrifice worth it?', a: 'For many higher-rate taxpayers it can be, due to low Benefit in Kind rates on electric vehicles combined with Income Tax and NI savings — but compare the total cost against buying or a standard lease, since scheme terms and available models vary by employer.' }
    ]
  },
  {
    slug: 'is-redundancy-pay-taxable',
    title: 'Is Redundancy Pay Taxable? The £30,000 Rule Explained',
    metaDesc: 'Is redundancy pay taxable in the UK? The first £30,000 is usually tax-free — here\'s exactly what counts, what doesn\'t, and how National Insurance applies.',
    intro: 'The headline rule is simple — the first £30,000 of redundancy pay is tax-free — but what actually counts toward that £30,000 trips a lot of people up.',
    body: `
  <h2>The £30,000 Tax-Free Rule</h2>
  <p>Statutory and most contractual (enhanced) redundancy pay combined are tax-free up to <strong>£30,000</strong>. Anything above that threshold is subject to Income Tax at your normal rate — but importantly, <strong>not</strong> National Insurance, even above £30,000.</p>
  <p>Use our <a href="/redundancy-pay-calculator/">redundancy pay calculator</a> to estimate your statutory entitlement, then apply this guide to work out the tax treatment.</p>

  <h2>What Counts Toward the £30,000?</h2>
  <ul>
    <li>Statutory redundancy pay</li>
    <li>Enhanced/contractual redundancy pay on top of the statutory minimum</li>
    <li>Ex-gratia (goodwill) payments made purely because of the redundancy</li>
  </ul>

  <h2>What Doesn't Count — and Is Taxed Normally</h2>
  <ul>
    <li><strong>Notice pay</strong> (whether worked or paid in lieu) — taxed as normal income, including National Insurance</li>
    <li><strong>Unpaid wages, holiday pay, bonuses owed</strong> — all taxed as normal salary</li>
    <li><strong>Any payment tied to a restrictive covenant or non-compete</strong> — taxed separately, not covered by the £30,000 exemption</li>
  </ul>

  <div class="callout">This is the single biggest source of confusion: a £35,000 "redundancy package" might include £8,000 of notice pay and unused holiday, meaning only £27,000 actually falls under the tax-free redundancy exemption — with the £8,000 taxed as normal salary regardless of the £30,000 limit.</div>

  <h2>Worked Example</h2>
  <div class="table-wrap"><table><tr><th>Component</th><th>Amount</th><th>Tax Treatment</th></tr>
  <tr><td>Statutory + enhanced redundancy</td><td>£25,000</td><td>Tax-free (within £30,000 limit)</td></tr>
  <tr><td>Payment in lieu of notice</td><td>£5,000</td><td>Taxed as normal income (Income Tax + NI)</td></tr>
  <tr><td>Total package</td><td>£30,000</td><td>£25,000 tax-free, £5,000 taxed normally</td></tr>
  </table></div>

  <h2>What If My Redundancy Pay Is Over £30,000?</h2>
  <p>The amount above £30,000 is added to your other income for the tax year and taxed at your marginal rate — potentially pushing some of it into a higher tax band if you receive it in one lump sum alongside your final salary. Your employer usually applies Income Tax through PAYE on the excess, but not National Insurance.</p>`,
    faqs: [
      { q: 'Is the first £30,000 of redundancy pay completely tax-free?', a: 'Yes, for genuine redundancy and termination payments — statutory redundancy pay, enhanced redundancy, and ex-gratia payments combined. Notice pay, unpaid wages and holiday pay are separate and taxed normally regardless of this allowance.' },
      { q: 'Do I pay National Insurance on redundancy pay?', a: 'No — genuine redundancy payments (even the portion above £30,000 that is subject to Income Tax) are exempt from National Insurance. Notice pay and other normal earnings within the package are not exempt.' },
      { q: 'Does redundancy pay affect my tax band for the year?', a: 'Any portion above £30,000 is added to your taxable income for the year, which can push you into a higher tax bracket if it lands in the same tax year as several months of salary — timing (e.g. requesting payment split across tax years, if your employer allows) can sometimes help.' },
      { q: 'Is redundancy pay taxed differently in Scotland?', a: 'No — the £30,000 exemption and National Insurance treatment are UK-wide rules set by HMRC, not devolved. Only the Income Tax rate applied to any taxable excess differs, using Scottish bands if you\'re a Scottish taxpayer.' }
    ]
  },
  {
    slug: 'do-i-need-to-pay-tax-on-side-income',
    title: 'Do I Need to Pay Tax on Side Income? The £1,000 Trading Allowance Explained',
    metaDesc: 'Do you need to pay tax on side income in the UK? The £1,000 trading allowance means small amounts are tax-free — here\'s when you need to register for Self Assessment.',
    intro: 'Selling on the side, freelancing evenings and weekends, or renting out a spare room? Whether you owe tax — and whether you even need to tell HMRC — depends on one number: £1,000.',
    body: `
  <h2>The £1,000 Trading Allowance</h2>
  <p>HMRC gives everyone a <strong>£1,000 tax-free trading allowance</strong> per tax year for miscellaneous income from self-employment, side hustles, or casual trading — separate from your employment Personal Allowance. If your gross side income is under £1,000 in a tax year, you generally don't need to declare it or register for Self Assessment at all.</p>

  <h2>What Counts as "Side Income"?</h2>
  <ul>
    <li>Freelance or contract work outside your main job</li>
    <li>Selling items regularly (not just clearing out your wardrobe once)</li>
    <li>Content creation, tutoring, dog walking, and similar gig-style work</li>
    <li>Rental income from a property (different allowance — see below)</li>
  </ul>

  <h2>What If I Earn More Than £1,000?</h2>
  <p>Once gross side income exceeds £1,000 in a tax year, you must register for Self Assessment and declare it — even if, after deducting expenses, you don't actually owe any tax. You have two options for how to calculate your taxable profit:</p>
  <ol>
    <li><strong>Deduct the £1,000 trading allowance</strong> from your income (simplest, no need to track individual expenses)</li>
    <li><strong>Deduct your actual allowable expenses</strong> instead, if they're higher than £1,000</li>
  </ol>
  <p>Use whichever gives you the lower taxable profit. See our <a href="/self-employed-tax-calculator/">self-employed tax calculator</a> once you know your profit figure.</p>

  <h2>Property and Rent-a-Room</h2>
  <p>Renting out a room in your own home has a separate, more generous <strong>Rent a Room Scheme</strong> allowance of £7,500 a year tax-free (£3,750 if shared with someone else). Income from a separate rental property uses a different £1,000 <em>property</em> allowance, distinct from the trading allowance above.</p>

  <div class="warning"><strong>Registration deadline:</strong> if you need to register for Self Assessment, the deadline is 5 October following the end of the tax year in which you started earning the income. Missing it can trigger a penalty even if no tax is ultimately owed.</div>

  <h2>Do I Owe Tax Even If I'm Under £1,000?</h2>
  <p>If your gross side income is under £1,000, you don't need to register or pay tax on it at all — the trading allowance covers it completely, regardless of your other income or tax band.</p>`,
    faqs: [
      { q: 'Do I need to tell HMRC about side income under £1,000?', a: 'No — the £1,000 trading allowance means income under that threshold is tax-free and doesn\'t need to be declared, regardless of your other earnings.' },
      { q: 'What happens if I earn £1,500 from a side hustle?', a: 'You must register for Self Assessment and declare it. You can deduct the £1,000 trading allowance, leaving £500 taxable, or deduct actual expenses if higher — then pay Income Tax (and Class 2/4 NI if applicable) on the remaining profit.' },
      { q: 'Does the £1,000 trading allowance apply per side hustle or in total?', a: 'In total — it\'s a single £1,000 allowance covering all your miscellaneous self-employed/trading income combined, not £1,000 per separate activity.' },
      { q: 'Is rental income covered by the same £1,000 allowance?', a: 'No — rental income from letting out a separate property uses its own £1,000 property allowance. Renting a room in your main home instead falls under the more generous £7,500 Rent a Room Scheme.' }
    ]
  },
  {
    slug: 'should-i-overpay-my-student-loan',
    title: 'Should I Overpay My Student Loan? What to Consider First',
    metaDesc: 'Should you overpay your UK student loan? For most Plan 2 and Plan 5 borrowers, the maths favours not overpaying — here\'s how to work out your own case.',
    intro: 'It feels responsible to clear debt early — but for many UK student loans, voluntary overpayment is one of the least efficient uses of spare cash. Here\'s how to actually check your own numbers.',
    body: `
  <h2>Why Student Loans Are Different From Other Debt</h2>
  <p>A UK student loan isn't a normal loan in the way a mortgage or credit card is. Repayments are:</p>
  <ul>
    <li>Based on <strong>income</strong>, not the amount you owe — 9% of earnings above your plan's threshold (6% for Postgraduate Loans)</li>
    <li><strong>Written off entirely</strong> after a set number of years (30 or 40, depending on plan), regardless of the remaining balance</li>
    <li>Stopped automatically if your income drops or you stop working — no missed-payment penalty like a normal loan</li>
  </ul>
  <p>Use our <a href="/student-loan-repayment-calculator/">student loan repayment calculator</a> to check your current plan's threshold and repayment rate.</p>

  <h2>The Key Question: Will You Clear the Balance Naturally, or Get Written Off First?</h2>
  <p>This is what actually determines whether overpaying helps:</p>
  <ul>
    <li><strong>If you're on track to be written off before repaying the full balance</strong> (common for Plan 2/5 borrowers with large loans on modest-to-average salaries), overpaying doesn't save you money long-term — it just hands HMRC/SLC money that would otherwise have been written off. Every pound you overpay in this scenario is, in effect, wasted.</li>
    <li><strong>If you're a high earner likely to clear the balance in full before the write-off date</strong>, overpaying can save you the interest that would otherwise accrue in the meantime — closer to how a normal loan works.</li>
  </ul>

  <div class="callout">Roughly speaking: the higher your expected lifetime earnings relative to your loan balance, the more a student loan behaves like "real debt" worth overpaying. The lower your expected earnings relative to the balance, the more it behaves like a graduate tax you'll likely never fully repay anyway.</div>

  <h2>What to Compare Overpayment Against</h2>
  <p>Before overpaying a student loan, compare against these alternatives for the same spare cash:</p>
  <ol>
    <li><strong>Pension contributions</strong> — especially if there's employer matching you're not fully using, this is very hard to beat.</li>
    <li><strong>High-interest debt</strong> (credit cards, overdrafts) — almost always worth clearing before a student loan, since the interest rate is typically far higher.</li>
    <li><strong>Emergency savings</strong> — a cash buffer before any voluntary overpayment, since student loan payments pause automatically if you lose income, but you still need to eat.</li>
    <li><strong>Stocks & shares ISA or general investing</strong> — for many Plan 2/5 borrowers, long-run expected investment returns can outperform the "return" from overpaying a loan that might be written off anyway.</li>
  </ol>

  <h2>When It's Genuinely Worth Overpaying</h2>
  <ul>
    <li>You're a high earner confident you'll clear the loan well before write-off</li>
    <li>You're on Plan 1 (lower threshold, and some Plan 1 borrowers are closer to full repayment)</li>
    <li>You're planning a mortgage application soon and want a cleaner affordability picture (a minor, situational factor)</li>
  </ul>`,
    faqs: [
      { q: 'Does overpaying my student loan improve my credit score?', a: 'No — UK student loans don\'t appear on your credit file and don\'t affect your credit score at all, so there\'s no credit-related reason to overpay.' },
      { q: 'What happens to my student loan if I never fully repay it?', a: 'It\'s written off completely after 30 years (Plan 2, most Plan 5 borrowers) or 25-40 years depending on plan and start date — with no further obligation, and no impact on your estate or family.' },
      { q: 'Is it ever better to overpay a Plan 5 loan?', a: 'Only really for high earners confident of clearing the full balance before the write-off point (typically 40 years for Plan 5) — for many average earners, the loan behaves more like a graduate tax that will be written off regardless.' },
      { q: 'Should I overpay before or after maxing out employer pension matching?', a: 'After — employer pension matching is close to a guaranteed 100%+ return on that portion of your contribution, which is very unlikely to be beaten by student loan overpayment for most borrowers.' }
    ]
  }
];

function pageHtml(g) {
  const canonical = `${SITE_URL}/${g.slug}/`;
  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${g.title} | mynetsalary.co.uk</title>
<meta name="description" content="${g.metaDesc}">
<link rel="canonical" href="${canonical}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" href="/favicon.png">
<meta property="og:title" content="${g.title}">
<meta property="og:description" content="${g.metaDesc}">
<meta property="og:type" content="article">
<meta property="og:url" content="${canonical}">
<meta name="google-site-verification" content="${GSC_TAG}" />
<script type="application/ld+json">
${JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Article", "headline": g.title, "description": g.metaDesc, "url": canonical, "author": { "@type": "Organization", "name": "mynetsalary.co.uk" }, "publisher": { "@type": "Organization", "name": "mynetsalary.co.uk" }, "inLanguage": "en-GB" },
    { "@type": "FAQPage", "mainEntity": faqJsonLd(g.faqs) },
    { "@type": "BreadcrumbList", "itemListElement": [ { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL + "/" }, { "@type": "ListItem", "position": 2, "name": "Guides", "item": SITE_URL + "/guides/" }, { "@type": "ListItem", "position": 3, "name": g.title, "item": canonical } ] }
  ]
}, null, 2)}
</script>
<style>${CSS}</style>
</head>
<body>
<header>
  <div class="flag">📖 Guide</div>
  <h1>${g.title}</h1>
  <p>${g.intro}</p>
</header>
<div class="content">
  <div class="meta">Updated for 2026/27 rates. Information only — not tax or legal advice.</div>
  ${g.body}
  ${SAT_GRID}
  <div class="cta-box">
    <h2>Check Your Own Numbers</h2>
    <p>Rules like these are easier to apply once you can see your actual take-home pay, tax and NI broken down.</p>
    <a href="/" class="cta-btn">Open the Take-Home Pay Calculator →</a>
  </div>
  <div class="eeat-section">Written using published HMRC guidance and gov.uk rules, current as of 2026/27. Not a substitute for personalised advice — for your specific circumstances, consult <a href="https://www.gov.uk/topic/personal-tax/income-tax" target="_blank" rel="noopener">gov.uk</a> or a qualified adviser via the <a href="https://register.fca.org.uk/" target="_blank" rel="noopener">FCA Register</a>.</div>
  ${faqHtml(g.faqs)}
</div>
<footer><p>Information only — not tax or legal advice.</p></footer>
<script>function toggleFaq(el) { el.classList.toggle('open'); el.nextElementSibling.classList.toggle('show'); }</script>
</body>
</html>`;
}

function hubHtml() {
  const canonical = `${SITE_URL}/guides/`;
  const cards = GUIDES.map(g => `<a class="guide-card" href="/${g.slug}/"><div class="t">${g.title}</div><div class="d">${g.metaDesc}</div></a>`).join('\n');
  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>UK Tax & Payroll Guides | mynetsalary.co.uk</title>
<meta name="description" content="Plain-English guides to UK tax codes, salary sacrifice, redundancy pay, side income tax and student loans — updated for 2026/27.">
<link rel="canonical" href="${canonical}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" href="/favicon.png">
<meta name="google-site-verification" content="${GSC_TAG}" />
<style>${CSS}</style>
</head>
<body>
<header>
  <div class="flag">📖 Guides</div>
  <h1>UK Tax &amp; Payroll Guides</h1>
  <p>Plain-English explainers on tax codes, salary sacrifice, redundancy pay and more — updated for 2026/27.</p>
</header>
<div class="content">
  ${cards}
</div>
<footer><p>Information only — not tax or legal advice.</p></footer>
</body>
</html>`;
}

for (const g of GUIDES) {
  const dir = path.join(__dirname, g.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), pageHtml(g));
}
console.log('Wrote', GUIDES.length, 'guide pages');

const hubDir = path.join(__dirname, 'guides');
fs.mkdirSync(hubDir, { recursive: true });
fs.writeFileSync(path.join(hubDir, 'index.html'), hubHtml());
console.log('Wrote guides/index.html hub');

const urls = [`${SITE_URL}/guides/`, ...GUIDES.map(g => `${SITE_URL}/${g.slug}/`)];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(u => `  <url><loc>${u}</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>`).join('\n') +
  `\n</urlset>\n`;
fs.writeFileSync(path.join(__dirname, 'sitemap-guides.xml'), sitemap);
console.log('Wrote sitemap-guides.xml with', urls.length, 'URLs');
