// Consistency harness for the historical-tax-year calculators.
// Asserts the shared computeTakeHome() (used by both the single-year pages and the
// /historical-take-home-pay-calculator/ hub) matches the established per-year primitives
// (restUkTax / scotlandTax / ni). Any drift between the two paths fails the build.
// Run: node generate-year-pages.test.js   (exit 1 on mismatch)

const { computeTakeHome, restUkTax, scotlandTax, ni, HUB_YEARS } = require('./generate-year-pages.js');

const salaries = [20000, 35000, 60000, 120000];
const regions = ['rest_uk', 'scotland'];
let fail = 0;
let cases = 0;

for (const y of HUB_YEARS) {
  for (const s of salaries) {
    for (const region of regions) {
      cases++;
      const got = computeTakeHome(s, y.label, region);
      const expIt = region === 'scotland' ? scotlandTax(s, y.scotland) : restUkTax(s);
      const expNi = ni(s, y.niRate);
      const expTakeHome = s - expIt - expNi;
      const bad =
        Math.abs(got.it - expIt) > 1e-6 ||
        Math.abs(got.ni - expNi) > 1e-6 ||
        Math.abs(got.takeHome - expTakeHome) > 1e-6;
      if (bad) {
        fail++;
        console.error(
          `MISMATCH ${y.label} / ${region} / £${s}\n` +
          `  computeTakeHome: it=${got.it.toFixed(2)} ni=${got.ni.toFixed(2)} takeHome=${got.takeHome.toFixed(2)}\n` +
          `  primitives:      it=${expIt.toFixed(2)} ni=${expNi.toFixed(2)} takeHome=${expTakeHome.toFixed(2)}`
        );
      }
    }
  }
}

if (fail) {
  console.error(`\n${fail}/${cases} case(s) failed — hub and single-year calculators have diverged.`);
  process.exit(1);
}
console.log(`computeTakeHome consistency OK (${cases} cases across ${HUB_YEARS.length} tax years).`);
