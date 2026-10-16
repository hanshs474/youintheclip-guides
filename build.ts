/**
 * Builds the YouInTheClip trend guides (MkDocs) from the main site's trend page JSON.
 * Read the Docs / GitBook / Mintlify all deploy from this repo. One page per trend:
 * what the trend is, the steps, example clips (played from cdn.youintheclip.com), a link
 * to the trend page with utm_source. Run from the site repo so @/ imports resolve:
 *   cd ~/shnext/2610/youintheclip && cp ../youintheclip-guides/build.ts .guides.tmp.ts \
 *     && npx tsx .guides.tmp.ts; rm .guides.tmp.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { SHOWCASE_VIDEOS } from '@/config/media/showcase-media';

const OUT = path.resolve(process.env.GUIDES_OUT || '../youintheclip-guides');
const SITE = 'https://youintheclip.com';
const PAGES_DIR = 'src/config/locale/messages/en/pages/video';
const UTM = '?utm_source=readthedocs';

const slugs = fs.readdirSync(PAGES_DIR).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''));
const trends = slugs
  .map((slug) => {
    const page = JSON.parse(fs.readFileSync(`${PAGES_DIR}/${slug}.json`, 'utf8')).page;
    const s = page.sections;
    const clips = (s.demo?.items ?? [])
      .map((it: any) => ({ title: it.title, desc: it.description, media: SHOWCASE_VIDEOS.find((v) => v.id === it.media_id) }))
      .filter((c: any) => c.media);
    return { slug, name: page.title as string, summary: page.description as string, what: s.what_is?.description as string, steps: s.how_to?.items ?? [], clips };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

fs.mkdirSync(`${OUT}/docs/trends`, { recursive: true });
for (const t of trends) {
  const url = `${SITE}/video/${t.slug}${UTM}`;
  const md = [
    `# ${t.name}`,
    '',
    t.what,
    '',
    '## How to make it',
    '',
    ...t.steps.map((st: any, i: number) => `${i + 1}. **${st.title}.** ${st.description}`),
    '',
    '## What the takes look like',
    '',
    ...t.clips.flatMap((c: any) => [
      `**${c.title}.** ${c.desc}`,
      '',
      `<video src="${c.media.src}" poster="${c.media.poster}" controls muted playsinline preload="none" width="270"></video>`,
      '',
    ]),
    `The clips show the look; they were not made on YouInTheClip. The [${t.name} template](${url}) rebuilds it on your own photo: one photo in, a 12-second vertical video out.`,
    '',
  ].join('\n');
  fs.writeFileSync(`${OUT}/docs/trends/${t.slug}.md`, md);
}

const index = [
  '# YouInTheClip trend guides',
  '',
  'AI trend video generator for the clips people are posting this week. Pick a trend, add one photo, and get a 12-second vertical video starring you.',
  '',
  'Each guide below explains one trend: where it came from, what happens in the clip, and the steps to make your own version from a single photo.',
  '',
  '| Trend | What happens |',
  '|---|---|',
  ...trends.map((t) => `| [${t.name}](trends/${t.slug}.md) | ${t.summary.replace(/\|/g, '/')} |`),
  '',
  `Templates for every trend live at [youintheclip.com](${SITE}/${UTM}).`,
  '',
].join('\n');
fs.writeFileSync(`${OUT}/docs/index.md`, index);

const yml = [
  'site_name: YouInTheClip trend guides',
  'site_url: https://youintheclip.readthedocs.io/',
  'repo_url: https://github.com/hanshs474/youintheclip-guides',
  'site_description: How the AI video trends people are posting work, and how to make your own from one photo.',
  'theme: readthedocs',
  'nav:',
  '  - Overview: index.md',
  '  - Trends:',
  ...trends.map((t) => `      - "${t.name.replace(/"/g, "'")}": trends/${t.slug}.md`),
  '',
].join('\n');
fs.writeFileSync(`${OUT}/mkdocs.yml`, yml);
fs.writeFileSync(`${OUT}/docs/requirements.txt`, 'mkdocs==1.6.1\n');
fs.writeFileSync(
  `${OUT}/.readthedocs.yaml`,
  'version: 2\nbuild:\n  os: ubuntu-24.04\n  tools:\n    python: "3.12"\nmkdocs:\n  configuration: mkdocs.yml\npython:\n  install:\n    - requirements: docs/requirements.txt\n'
);
console.log(`${trends.length} trend pages`);
