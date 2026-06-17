/**
 * Copy the canonical NVL fixture into the production build so the served app
 * loads it from /data/nvl_ontology_data.json with zero network dependency
 * (NFM-228 E2E, matrix M1). Run after `react-scripts build` (npm run build:e2e).
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const src = path.join(root, 'e2e', 'fixtures', 'nvl_ontology_data.json');
const destDir = path.join(root, 'build', 'data');
const dest = path.join(destDir, 'nvl_ontology_data.json');

if (!fs.existsSync(src)) {
  console.error(`[NFM-228] fixture missing: ${src}. Run "npm run regen:fixture".`);
  process.exit(1);
}

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log(`[NFM-228] copied fixture -> ${path.relative(root, dest)}`);
