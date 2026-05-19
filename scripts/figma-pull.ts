import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

const TOKEN = process.env.FIGMA_TOKEN!;
const FILE = process.env.FIGMA_FILE!;
const OUT_DIR = path.join(process.cwd(), 'public', 'img');
const MANIFEST_JSON = path.join(process.cwd(), 'src', 'content', 'manifest.json');
const CASES_TS = path.join(process.cwd(), 'src', 'content', 'cases.ts');

if (!TOKEN) throw new Error('Нет FIGMA_TOKEN в .env.local');
if (!FILE) throw new Error('Нет FIGMA_FILE в .env.local');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
if (!fs.existsSync(path.dirname(MANIFEST_JSON))) fs.mkdirSync(path.dirname(MANIFEST_JSON), { recursive: true });

const api = axios.create({
  baseURL: 'https://api.figma.com/v1',
  headers: { 'X-FIGMA-TOKEN': TOKEN }
});

type Node = {
  id: string;
  name: string;
  type: string;
  absoluteBoundingBox?: { x: number; y: number; width: number; height: number };
  children?: Node[];
};
type Page = Node;

const slugify = (s: string) =>
  s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9Ѐ-ӿ\s-]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const isHomeName = (n: string) => /home|главная|main/i.test(n);

function topLevelFrames(page: Page) {
  return (page.children || [])
    .filter(n => ['FRAME', 'COMPONENT', 'INSTANCE'].includes(n.type))
    .sort((a, b) => (a.absoluteBoundingBox?.y ?? 0) - (b.absoluteBoundingBox?.y ?? 0));
}

(async () => {
  try {
    const file = await api.get(`/files/${FILE}`);
    const root: Node = file.data.document;
    const pages: Page[] = (root.children || []).filter(n => n.type === 'CANVAS') as Page[];

    if (!pages.length) {
      console.log('В файле нет страниц (CANVAS). Проверь FILE_KEY.');
      return;
    }

    const manifest: any = { home: null, cases: [] as any[] };
    let downloadCount = 0;

    const queue: { id: string; outName: string; pageType: 'home' | 'case'; caseSlug?: string }[] = [];

    for (const page of pages) {
      const frames = topLevelFrames(page);
      console.log(`Страница "${page.name}": найдено ${frames.length} кадров`);
      if (!frames.length) continue;

      if (isHomeName(page.name)) {
        frames.forEach((f, i) => {
          const outName = i === 0 ? 'home-hero.png' : `home-section-${String(i).padStart(2, '0')}.png`;
          queue.push({ id: f.id, outName, pageType: 'home' });
        });
      } else {
        const slug = slugify(page.name) || 'case';
        frames.forEach((f, i) => {
          const outName = i === 0
            ? `case-${slug}-hero.png`
            : `case-${slug}-section-${String(i).padStart(2, '0')}.png`;
          queue.push({ id: f.id, outName, pageType: 'case', caseSlug: slug });
        });
      }
    }

    if (!queue.length) {
      console.log('Не найдено ни одного верхнеуровневого кадра. На каждой странице оставь кадры (Frame) в столбик.');
      return;
    }

    console.log(`\nВсего кадров для рендера: ${queue.length}`);

    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    const chunk = <T,>(arr: T[], n = 10) =>
      Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, (i + 1) * n));

    for (const [idx, part] of chunk(queue, 1).entries()) {
      if (idx > 0) await sleep(500);
      const ids = part.map(x => x.id).join(',');
      console.log(`Рендерю ${part.length} кадров через Figma API...`);
      const { data } = await api.get(`/images/${FILE}`, { params: { ids, format: 'png', scale: 1 } });
      for (const item of part) {
        const url = data.images[item.id];
        if (!url) {
          console.warn(`  Нет URL для кадра ${item.outName}`);
          continue;
        }
        const res = await axios.get<ArrayBuffer>(url, { responseType: 'arraybuffer' });
        const p = path.join(OUT_DIR, item.outName);
        fs.writeFileSync(p, Buffer.from(res.data));
        console.log(`  Сохранено: public/img/${item.outName}`);
        downloadCount++;
      }
    }

    const all = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.png') || f.endsWith('.webp'));
    const home = {
      hero: all.find(f => f === 'home-hero.png' || f === 'home-hero.webp') || null,
      sections: all.filter(f => /^home-section-\d{2}\.(png|webp)$/.test(f)).sort()
    };
    const byCase = all
      .filter(f => f.startsWith('case-') && /-(hero)\.(png|webp)$/.test(f))
      .map(hero => {
        const slug = hero.replace(/^case-/, '').replace(/-hero\.(png|webp)$/, '');
        const sections = all
          .filter(f => f.startsWith(`case-${slug}-section-`) && /\.(png|webp)$/.test(f))
          .sort();
        const title = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        return { slug, title, hero, sections };
      });

    manifest.home = home;
    manifest.cases = byCase;

    fs.writeFileSync(MANIFEST_JSON, JSON.stringify(manifest, null, 2), 'utf8');

    const ts = `export type CaseItem = {
  slug: string;
  title: string;
  hero: string;
  sections: string[];
};
export type Manifest = {
  home: { hero: string | null; sections: string[] };
  cases: CaseItem[];
};
import data from './manifest.json';
export default data as Manifest;
`;
    fs.writeFileSync(CASES_TS, ts, 'utf8');

    console.log(`\nСкачано изображений: ${downloadCount}`);
    console.log('Манифест:', MANIFEST_JSON);
    console.log('Готово. Используйте src/content/cases.ts в роутах / и /cases/[slug].');
  } catch (e: any) {
    console.error(e.response?.status, e.response?.data || e.message);
    process.exit(1);
  }
})();
