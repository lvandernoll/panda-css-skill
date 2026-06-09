#!/usr/bin/env node
// Digest a Panda CSS *compiled* styled-system dir into a compact, token-aware
// summary so an agent can author project-correct styles without loading the
// whole generated output.
//
// Usage:
//   node inspect-styled-system.mjs [styled-system-dir]
//
// If no dir is given, walks up from cwd looking for a folder that contains
// tokens/tokens.d.ts (the canonical marker of a generated styled-system).
// Honors PANDA_STYLED_SYSTEM env var as an explicit override.

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';

const read = (p) => {
  try {
    return readFileSync(p, 'utf8');
  } catch {
    return '';
  }
};

const isStyledSystem = (dir) =>
  existsSync(join(dir, 'tokens', 'tokens.d.ts'));

function locate() {
  if (process.env.PANDA_STYLED_SYSTEM) {
    const d = resolve(process.env.PANDA_STYLED_SYSTEM);
    if (isStyledSystem(d)) return d;
  }
  const arg = process.argv[2];
  if (arg) {
    const d = resolve(arg);
    if (isStyledSystem(d)) return d;
    // allow passing a project root that contains styled-system/
    const nested = join(d, 'styled-system');
    if (isStyledSystem(nested)) return nested;
    return null;
  }
  // walk up from cwd, check ./styled-system and ./ at each level
  let cur = process.cwd();
  let root = null;
  for (let i = 0; i < 12; i++) {
    if (isStyledSystem(cur)) return cur;
    const nested = join(cur, 'styled-system');
    if (isStyledSystem(nested)) return nested;
    // lock onto the *innermost* repo/workspace root (first match wins)
    if (
      root === null &&
      (existsSync(join(cur, '.git')) ||
        existsSync(join(cur, 'pnpm-workspace.yaml')) ||
        existsSync(join(cur, 'turbo.json')))
    )
      root = cur;
    const parent = dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  if (root === null) root = process.cwd();
  // monorepo fallback: bounded downward search from the repo root for any
  // tokens/tokens.d.ts (e.g. packages/styled-system). Skips node_modules/dot dirs.
  return searchDown(root, 5);
}

function searchDown(start, maxDepth) {
  const queue = [[start, 0]];
  while (queue.length) {
    const [dir, depth] = queue.shift();
    if (isStyledSystem(dir)) return dir;
    if (depth >= maxDepth) continue;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      queue.push([join(dir, e.name), depth + 1]);
    }
  }
  return null;
}

// Collapse a `export type XToken = "a" | "b" | ...` union into a value list.
function parseUnion(src, typeName) {
  const re = new RegExp(`export type ${typeName}\\s*=\\s*([^\\n]+)`);
  const m = src.match(re);
  if (!m) return null;
  return m[1]
    .split('|')
    .map((s) => s.trim().replace(/^["'`]|["'`]$/g, ''))
    .filter(Boolean);
}

function section(title) {
  return `\n## ${title}`;
}

function summarizeTokens(dir, out) {
  const src = read(join(dir, 'tokens', 'tokens.d.ts'));
  if (!src) return;
  out.push(section('Token categories'));
  const cats = parseUnion(src, 'Token');
  // Token union is `colors.${ColorToken}` | ... — list the category names.
  if (cats) {
    const names = cats
      .map((c) => c.replace(/\$\{[^}]+\}/, '').replace(/\.$/, ''))
      .filter(Boolean);
    out.push(names.join(', '));
  }
  // Per-category value lists (the useful ones).
  const interesting = [
    ['colors', 'ColorToken'],
    ['gradients', 'GradientToken'],
    ['assets', 'AssetToken'],
    ['spacing', 'SpacingToken'],
    ['sizes', 'SizeToken'],
    ['radii', 'RadiusToken'],
    ['fontSizes', 'FontSizeToken'],
    ['fontWeights', 'FontWeightToken'],
    ['fonts', 'FontToken'],
    ['shadows', 'ShadowToken'],
    ['blurs', 'BlurToken'],
    ['animations', 'AnimationToken'],
    ['durations', 'DurationToken'],
    ['easings', 'EasingToken'],
    ['breakpoints', 'BreakpointToken'],
    ['aspectRatios', 'AspectRatioToken'],
    ['lineHeights', 'LineHeightToken'],
    ['letterSpacings', 'LetterSpacingToken'],
    ['borders', 'BorderToken'],
    ['borderWidths', 'BorderWidthToken'],
    ['zIndex', 'ZIndexToken'],
    ['opacity', 'OpacityToken'],
    ['cursor', 'CursorToken'],
  ];
  for (const [label, type] of interesting) {
    const vals = parseUnion(src, type);
    if (vals && vals.length) {
      out.push(`\n### ${label} (${vals.length})\n${vals.join(', ')}`);
    }
  }
  const palette = parseUnion(src, 'ColorPalette');
  if (palette) out.push(`\n### colorPalettes\n${palette.join(', ')}`);
}

function summarizeTextStyles(dir, out) {
  // textStyles surface as the `textStyle` style-prop union in prop-type.d.ts.
  const src = read(join(dir, 'types', 'prop-type.d.ts'));
  if (!src) return;
  const m = src.match(/\btextStyle:\s*([^\n;]+)/);
  if (!m) return;
  const vals = m[1]
    .split('|')
    .map((s) => s.trim().replace(/["'`]/g, ''))
    .filter(Boolean);
  if (vals.length) out.push(`${section('textStyles')}\n${vals.join(', ')}`);
}

function summarizeConditions(dir, out) {
  const src = read(join(dir, 'types', 'conditions.d.ts'));
  if (!src) return;
  out.push(section('Conditions'));
  const re = /\/\*\*\s*(.*?)\s*\*\/\s*\n\s*"([^"]+)":/g;
  let m;
  const lines = [];
  while ((m = re.exec(src))) lines.push(`${m[2]}  →  ${m[1]}`);
  if (lines.length) out.push(lines.join('\n'));
  else {
    // fallback: just the keys
    const keys = [...src.matchAll(/"(_[A-Za-z0-9]+)":/g)].map((x) => x[1]);
    out.push([...new Set(keys)].join(', '));
  }
}

function summarizeRecipes(dir, out) {
  const recDir = join(dir, 'recipes');
  if (!existsSync(recDir)) return;
  out.push(section('Recipes (config) — name: variantKey=values [default]'));
  const files = readdirSync(recDir)
    .filter((f) => f.endsWith('.d.ts') && !f.startsWith('index') && f !== 'create-recipe.d.ts')
    .sort();
  for (const f of files) {
    const name = f.replace(/\.d\.ts$/, '');
    const src = read(join(recDir, f));
    // slots
    const slotM = src.match(/type \w+Slot = ([^\n]+)/);
    const slots = slotM
      ? slotM[1].split('|').map((s) => s.trim().replace(/["'`]/g, '')).filter(Boolean)
      : null;
    // variant interface block
    const ivM = src.match(/interface \w+Variant \{([\s\S]*?)\n\}/);
    const variants = [];
    if (ivM) {
      const body = ivM[1];
      // each prop: optional jsdoc @default then `name: type`
      const propRe = /(?:\/\*\*[\s\S]*?@default\s+([^\n]*?)\s*\*\/\s*)?\n\s*(\w+):\s*([^\n]+)/g;
      let pm;
      while ((pm = propRe.exec(body))) {
        const def = pm[1] ? pm[1].replace(/["'`]/g, '').trim() : null;
        const key = pm[2];
        const type = pm[3]
          .trim()
          .replace(/\s*\|\s*/g, '|');
        const vals =
          type === 'boolean'
            ? 'true|false'
            : type.replace(/["'`]/g, '');
        variants.push(`${key}=${vals}${def ? ` [${def}]` : ''}`);
      }
    }
    let line = `- ${name}`;
    if (slots) line += `  slots: {${slots.join(', ')}}`;
    if (variants.length) line += `\n    ${variants.join('  |  ')}`;
    out.push(line);
  }
}

function summarizePatterns(dir, out) {
  const src = read(join(dir, 'patterns', 'index.d.ts'));
  if (!src) return;
  const names = [...src.matchAll(/export \* from '\.\/([a-z-]+)'/g)].map((m) => m[1]);
  if (names.length) {
    out.push(section('Patterns'));
    out.push(names.join(', '));
  }
}

const dir = locate();
if (!dir) {
  console.error(
    'No compiled styled-system found. Pass a path, set PANDA_STYLED_SYSTEM, or run from inside the project.',
  );
  process.exit(1);
}

const out = [`# styled-system digest\n${dir}`];
summarizeTokens(dir, out);
summarizeTextStyles(dir, out);
summarizeConditions(dir, out);
summarizeRecipes(dir, out);
summarizePatterns(dir, out);
console.log(out.join('\n'));
