import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

const TOKEN = process.env.FIGMA_TOKEN!;
const FILE = process.env.FIGMA_FILE!;
const OUT_DIR = path.join(process.cwd(), 'public', 'img');

if (!TOKEN) throw new Error('Нет FIGMA_TOKEN');
if (!FILE) throw new Error('Нет FIGMA_FILE');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const api = axios.create({
  baseURL: 'https://api.figma.com/v1',
  headers: { 'X-FIGMA-TOKEN': TOKEN },
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// node ID → output filename
const assets: { id: string; out: string }[] = [
  // Home — hero background (planets/visual layer only, no text)
  { id: '341:811', out: 'home-hero-bg.png' },
  // Home — case preview images (just the screenshot rectangles)
  { id: '341:914', out: 'home-eurochem-img.png' },
  { id: '341:940', out: 'home-hrcrm-img.png' },
  { id: '341:965', out: 'home-rsb-img.png' },
  // Eurochem case page
  { id: '341:1221', out: 'eurochem-viz.png' },
  { id: '341:1289', out: 'eurochem-situation.png' },
  { id: '341:1298', out: 'eurochem-roles.png' },
  { id: '341:1303', out: 'eurochem-results.png' },
  // HR-CRM case page
  { id: '341:1380', out: 'hrcrm-viz.png' },
  { id: '341:1452', out: 'hrcrm-situation.png' },
  { id: '341:1525', out: 'hrcrm-roles.png' },
  { id: '341:1530', out: 'hrcrm-results.png' },
  // Rosselkhozbank case page
  { id: '341:1744', out: 'rsb-viz.png' },
  { id: '341:1812', out: 'rsb-situation.png' },
  { id: '341:1866', out: 'rsb-roles.png' },
  { id: '341:1872', out: 'rsb-results.png' },
];

(async () => {
  let downloaded = 0;
  for (const [i, asset] of assets.entries()) {
    if (i > 0) await sleep(600);
    try {
      console.log(`[${i + 1}/${assets.length}] Рендер ${asset.out}...`);
      const { data } = await api.get(`/images/${FILE}`, {
        params: { ids: asset.id, format: 'png', scale: 2 },
      });
      const url = data.images[asset.id];
      if (!url) { console.warn('  Нет URL'); continue; }
      const res = await axios.get<ArrayBuffer>(url, { responseType: 'arraybuffer' });
      fs.writeFileSync(path.join(OUT_DIR, asset.out), Buffer.from(res.data));
      console.log(`  ✓ ${asset.out}`);
      downloaded++;
    } catch (e: any) {
      console.error(`  ✗ ${asset.out}:`, e.response?.status, e.response?.data || e.message);
    }
  }
  console.log(`\nГотово. Скачано: ${downloaded}/${assets.length}`);
})();
