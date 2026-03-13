import { readFileSync } from 'fs';

const brief = readFileSync('src/screens/BriefScreen.jsx', 'utf-8');
const app = readFileSync('src/App.jsx', 'utf-8');

const checks = [
  {
    label: 'justMovedId removed from BriefScreen',
    pass: !brief.includes('justMovedId'),
  },
  {
    label: 'brokenLinks patch present in App.jsx startSession()',
    pass: app.includes('brokenLinks.size > 0'),
  },
  {
    label: 'sessionSkip biserie guard present in BriefScreen activePairs',
    pass: brief.includes('sessionSkip.has(id1) || sessionSkip.has(id2)'),
  },
  {
    label: 'seenBlkIds duplicate header fix present in BriefScreen',
    pass: brief.includes('seenBlkIds'),
  },
];

let failed = false;
for (const check of checks) {
  if (check.pass) {
    console.log(`✅ ${check.label}`);
  } else {
    console.error(`❌ BLOCKED: ${check.label}`);
    failed = true;
  }
}

if (failed) {
  console.error('\nDeploy blocked. Fix failing checks before retrying.');
  process.exit(1);
}

console.log('\n✅ All checks passed. Proceeding with deploy.');
