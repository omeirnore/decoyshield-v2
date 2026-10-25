#!/usr/bin/env node
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const rulesDir = resolve(root, 'rules');

const LISTS = [
  { name: 'ads', displayName: 'EasyList', url: 'https://easylist.to/easylist/easylist.txt', idOffset: 1, maxRules: 30000, format: 'abp' },
  { name: 'trackers', displayName: 'EasyPrivacy', url: 'https://easylist.to/easylist/easyprivacy.txt', idOffset: 100001, maxRules: 30000, format: 'abp' },
  { name: 'supplementary', displayName: "Peter Lowe's", url: 'https://pgl.yoyo.org/adservers/serverlist.php?hostformat=hosts&mimetype=plaintext', idOffset: 200001, maxRules: 30000, format: 'hosts' },
];

const ALL_RESOURCE_TYPES = [
  'main_frame', 'sub_frame', 'stylesheet', 'script', 'image',
  'font', 'object', 'xmlhttprequest', 'ping', 'media', 'websocket', 'other',
];

const ABP_RESOURCE_MAP = {
  script: 'script', image: 'image', stylesheet: 'stylesheet',
  object: 'object', xmlhttprequest: 'xmlhttprequest', subdocument: 'sub_frame',
  ping: 'ping', media: 'media', websocket: 'websocket', font: 'font', other: 'other',
  'object-subrequest': 'object',
};

function parseAbpLine(line) {
  line = line.trim();
  if (!line || line.startsWith('!') || line.startsWith('[') ||
      line.includes('##') || line.includes('#@#') || line.includes('#?#')) return null;

  let isException = false;
  if (line.startsWith('@@')) { isException = true; line = line.slice(2); }
  if (!line.startsWith('||')) return null;

  let pattern = line, options = '';
  const dollarIdx = line.lastIndexOf('$');
  if (dollarIdx > 0) { pattern = line.slice(0, dollarIdx); options = line.slice(dollarIdx + 1); }
  pattern = pattern.slice(2);

  const condition = { urlFilter: '||' + pattern };

  if (options) {
    const resourceTypes = [], excludedTypes = [];
    for (const opt of options.split(',')) {
      const t = opt.trim();
      if (t === 'third-party') condition.domainType = 'thirdParty';
      else if (t === '~third-party' || t === 'first-party') condition.domainType = 'firstParty';
      else if (t.startsWith('~') && ABP_RESOURCE_MAP[t.slice(1)]) excludedTypes.push(ABP_RESOURCE_MAP[t.slice(1)]);
      else if (ABP_RESOURCE_MAP[t]) resourceTypes.push(ABP_RESOURCE_MAP[t]);
      else if (t.startsWith('domain=') || t === 'popup' || t === 'document' || t === 'elemhide'
               || t === 'generichide' || t === 'genericblock' || t === 'important') continue;
      else return null;
    }
    if (resourceTypes.length > 0) condition.resourceTypes = resourceTypes;
    else if (excludedTypes.length > 0) condition.excludedResourceTypes = excludedTypes;
  }

  if (!condition.resourceTypes && !condition.excludedResourceTypes) {
    condition.resourceTypes = ALL_RESOURCE_TYPES;
  }

  return { action: { type: isException ? 'allow' : 'block' }, condition };
}

function parseHostsLine(line) {
  line = line.trim();
  if (!line || line.startsWith('#')) return null;
  const parts = line.split(/\s+/);
  if (parts.length < 2 || (parts[0] !== '0.0.0.0' && parts[0] !== '127.0.0.1')) return null;
  const domain = parts[1];
  if (!domain || domain === 'localhost' || domain === 'localhost.localdomain') return null;
  return { action: { type: 'block' }, condition: { urlFilter: '||' + domain + '^', resourceTypes: ALL_RESOURCE_TYPES } };
}

async function convertList({ name, displayName, url, idOffset, maxRules, format }) {
  console.log(`\nConverting ${displayName} (${name})...`);
  console.log(`  Downloading ${url}...`);

  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const text = await response.text();
  const parser = format === 'hosts' ? parseHostsLine : parseAbpLine;

  const rules = [];
  let skipped = 0;
  for (const line of text.split('\n')) {
    const rule = parser(line);
    if (rule) rules.push(rule);
    else if (line.trim() && !line.startsWith('!') && !line.startsWith('#') && !line.startsWith('[')) skipped++;
  }
  console.log(`  Parsed ${rules.length} rules (${skipped} skipped)`);

  let finalRules = rules;
  if (rules.length > maxRules) {
    console.warn(`  WARNING: truncating from ${rules.length} to ${maxRules}`);
    finalRules = rules.slice(0, maxRules);
  }

  return finalRules.map((rule, idx) => ({
    id: idOffset + idx,
    priority: rule.action.type === 'allow' ? 2 : 1,
    ...rule,
  }));
}

async function main() {
  if (!existsSync(rulesDir)) mkdirSync(rulesDir, { recursive: true });
  const metadata = [];

  for (const list of LISTS) {
    try {
      const rules = await convertList(list);
      writeFileSync(resolve(rulesDir, `${list.name}.json`), JSON.stringify(rules));
      console.log(`  Wrote ${rules.length} rules`);
      metadata.push({ id: list.name, name: list.displayName, sourceUrl: list.url, ruleCount: rules.length, convertedAt: new Date().toISOString() });
    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
      writeFileSync(resolve(rulesDir, `${list.name}.json`), '[]');
      metadata.push({ id: list.name, name: list.displayName, sourceUrl: list.url, ruleCount: 0, convertedAt: new Date().toISOString(), error: err.message });
    }
  }

  writeFileSync(resolve(rulesDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
  console.log('\nDone! Metadata written to rules/metadata.json');
}

main().catch(console.error);
