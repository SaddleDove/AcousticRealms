// Collect real public audio datasets:
//  - Birdsong: Freesound CC0 / BY preview audio (hq mp3), grouped by species
//  - Whale song: public humpback recordings from NOAA/PMEL, NPS Glacier Bay, Ocean Mammal Institute
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), 'public/media/audio');
fs.mkdirSync(path.join(root, 'birds'), { recursive: true });
fs.mkdirSync(path.join(root, 'whales'), { recursive: true });

const UA = 'Mozilla/5.0 (compatible; BioacousticsLab/1.0; +education)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function download(url, file, label, maxBytes = Infinity) {
  if (fs.existsSync(file) && fs.statSync(file).size > 8_000) {
    console.log(`  skip ${path.basename(file)}`);
    return true;
  }
  try {
    // Pre-check size, skip overly long recordings
    const head = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': UA } });
    const len = Number(head.headers.get('content-length') || 0);
    if (len > maxBytes) {
      console.log(`  skip ${label} ${path.basename(file)} too large ${(len / 1024).toFixed(0)}KB`);
      return false;
    }
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok || res.status !== 200) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 12_000) throw new Error(`too small ${buf.length}`);
    fs.writeFileSync(file, buf);
    console.log(`  OK ${label} ${path.basename(file)} ${(buf.length / 1024).toFixed(0)}KB`);
    return true;
  } catch (e) {
    console.error(`  FAIL ${label} ${url}: ${e instanceof Error ? e.message : e}`);
    return false;
  }
}

// ---------- Birdsong: Freesound collection ----------
const birdSpecies = [
  {
    id: 'nightingale',
    zh: '新疆歌鸲（夜莺）',
    en: 'Common Nightingale',
    latin: 'Luscinia megarhynchos',
    queries: ['nightingale song', 'luscinia megarhynchos'],
  },
  {
    id: 'cuckoo',
    zh: '大杜鹃（布谷鸟）',
    en: 'Common Cuckoo',
    latin: 'Cuculus canorus',
    queries: ['cuculus canorus song', 'common cuckoo call'],
  },
  {
    id: 'blackbird',
    zh: '乌鸫',
    en: 'Common Blackbird',
    latin: 'Turdus merula',
    queries: ['turdus merula song', 'blackbird dawn song'],
  },
  {
    id: 'robin',
    zh: '欧亚鸲（知更鸟）',
    en: 'European Robin',
    latin: 'Erithacus rubecula',
    queries: ['erithacus rubecula song', 'robin bird song'],
  },
  {
    id: 'greattit',
    zh: '大山雀',
    en: 'Great Tit',
    latin: 'Parus major',
    queries: ['parus major song', 'great tit call'],
  },
];

async function freesoundSearch(query) {
  const url = `https://freesound.org/search/?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  const html = await res.text();
  const ids = [...html.matchAll(/\/people\/[^"]+\/sounds\/(\d+)\/"/g)].map((m) => m[1]);
  const oggs = [...html.matchAll(/data-ogg="(https:\/\/cdn\.freesound\.org\/previews\/[^"]+)"/g)].map((m) => m[1]);
  const titles = [...html.matchAll(/sounds\/\d+\/"[^>]*>\s*([^<\n]{2,120})/g)].map((m) => m[1].trim());
  const users = [...html.matchAll(/\/people\/([^/"]+)\/sounds\/\d+\//g)].map((m) => m[1]);
  const n = Math.min(ids.length, oggs.length, titles.length);
  const out = [];
  const seen = new Set();
  for (let i = 0; i < n; i++) {
    if (seen.has(ids[i])) continue;
    seen.add(ids[i]);
    out.push({
      id: ids[i],
      title: titles[i],
      user: users[i] || 'unknown',
      hq: oggs[i].replace('-lq.ogg', '-lq.mp3'),
      page: `https://freesound.org/people/${users[i] || 'unknown'}/sounds/${ids[i]}/`,
    });
  }
  return out;
}

const birdDataset = [];
for (const sp of birdSpecies) {
  console.log(`\n[bird] ${sp.zh}`);
  const pool = [];
  const seenIds = new Set();
  for (const q of sp.queries) {
    try {
      const r = await freesoundSearch(q);
      for (const item of r) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          pool.push(item);
        }
      }
    } catch (e) {
      console.error(`  search fail "${q}":`, e instanceof Error ? e.message : e);
    }
    await sleep(1500);
  }
  const clips = [];
  let idx = 0;
  for (const item of pool) {
    if (clips.length >= 6) break;
    idx++;
    const fname = `${sp.id}-${clips.length + 1}.mp3`;
    const ok = await download(item.hq, path.join(root, 'birds', fname), `bird/${sp.id}`, 550_000);
    if (ok) {
      clips.push({
        file: `/media/audio/birds/${fname}`,
        title: item.title,
        source: item.page,
        recordist: item.user,
      });
    }
    await sleep(300);
  }
  void idx;
  birdDataset.push({ ...sp, clips });
}

// ---------- Whale song: fixed public sources ----------
const whaleGroups = [
  {
    id: 'alpha',
    name: 'Individual α · Alaska stock',
    region: 'Alaska waters · winter feeding grounds',
    desc: 'Low moans and sweeping up-down frequency sweeps; PMEL 1999 winter hydrophone array recordings.',
    source: 'NOAA / PMEL Acoustics Program',
    clips: [
      { url: 'https://pmel.noaa.gov/acoustics/whales/sounds/whalewav/akhumphi1x.wav', fname: 'alpha-1.wav', title: 'Alaska humpback moans & pulse trains' },
    ],
  },
  {
    id: 'beta',
    name: 'Individual β · Classic tropical song',
    region: 'Tropical breeding grounds · song units',
    desc: 'Structurally ordered breeding-season song phrases with melodic pitch contours.',
    source: 'Ocean Mammal Institute · Songs of the Humpback Whale',
    clips: [
      { url: 'http://www.oceanmammalinst.org/songs/hmpback1.wav', fname: 'beta-1.wav', title: 'Humpback Song #1' },
      { url: 'http://www.oceanmammalinst.org/songs/hmpback2.wav', fname: 'beta-2.wav', title: 'Humpback Song #2' },
      { url: 'http://www.oceanmammalinst.org/songs/hmpback3.wav', fname: 'beta-3.wav', title: 'Humpback Song #3' },
      { url: 'http://www.oceanmammalinst.org/songs/hmpback4.wav', fname: 'beta-4.wav', title: 'Humpback Song #4' },
    ],
  },
  {
    id: 'gamma',
    name: 'Individual γ · Glacier Bay mother & calf',
    region: 'Glacier Bay National Park, Alaska · 2000–2020',
    desc: 'Mother–calf contact calls (whup/moo) with fin slaps and tail beats; NPS long-term monitoring recordings.',
    source: 'U.S. National Park Service · Glacier Bay',
    clips: [
      { url: 'https://www.nps.gov/glba/learn/nature/upload/Humpback_whale_whup_24Oct00-131753.mp3', fname: 'gamma-1.mp3', title: 'Contact call — whup' },
      { url: 'https://www.nps.gov/glba/learn/nature/upload/Humpback_whale_moo_etc_25Sep01-0840.mp3', fname: 'gamma-2.mp3', title: 'Contact call — moo' },
      { url: 'https://www.nps.gov/glba/learn/nature/upload/06_22_2020_1700-1725a_vocals_snip1-AMPLIFIED.mp3', fname: 'gamma-3.mp3', title: 'Mother / calf vocals 2020' },
      { url: 'https://www.nps.gov/glba/learn/nature/upload/Humpback_whale_song_-_outboard_23Oct00-0909.mp3', fname: 'gamma-4.mp3', title: 'Song with outboard engine' },
    ],
  },
];

const whaleDataset = [];
for (const g of whaleGroups) {
  console.log(`\n[whale] ${g.name}`);
  const clips = [];
  for (const c of g.clips) {
    const ok = await download(c.url, path.join(root, 'whales', c.fname), `whale/${g.id}`);
    if (ok) {
      clips.push({ file: `/media/audio/whales/${c.fname}`, title: c.title, sourceUrl: c.url });
    }
    await sleep(400);
  }
  whaleDataset.push({
    id: g.id,
    name: g.name,
    region: g.region,
    desc: g.desc,
    source: g.source,
    clips,
  });
}

const manifest = {
  generatedAt: new Date().toISOString(),
  birds: birdDataset,
  whales: whaleDataset,
};
fs.writeFileSync(path.join(root, 'dataset.json'), JSON.stringify(manifest, null, 2));
console.log('\n[done] manifest written:', JSON.stringify({
  birds: birdDataset.map((b) => ({ id: b.id, clips: b.clips.length })),
  whales: whaleDataset.map((w) => ({ id: w.id, clips: w.clips.length })),
}, null, 2));
