# Reading a project's own Panda config

Panda is config-driven: every project defines its **own** tokens, colors,
semantic tokens, conditions, recipes, patterns, and textStyles. Generic token
names (`red.500`, `gray.200`) are often wrong — a project may rename, drop, or
add palettes (`brand.*`, `mono.*`, semantic `text` / `border`). **Before
authoring styles, learn the project's actual config.** Two sources:

1. **Compiled `styled-system/`** — authoritative, always in sync with the build.
   The `.d.ts` files are machine-readable lists of every valid value.
2. **Preset / `panda.config.ts` source** — the *intent* (why tokens exist, how
   semantic tokens switch on conditions, raw color values, asset URLs). Best for
   editing config, not just consuming it.

Prefer (1) for "what values may I use?"; consult (2) when editing the design
system or you need raw values / descriptions.

## Fast path: the inspector script

`scripts/inspect-styled-system.mjs` digests a compiled styled-system into a
compact summary (tokens by category, semantic colors, textStyles, conditions,
recipes with variant keys/values/defaults + slots, patterns).

```bash
# auto-locate (walks up to repo root, then searches down past node_modules)
node "$SKILL_DIR/scripts/inspect-styled-system.mjs"

# explicit dir (monorepo package, or a user-defined design system)
node "$SKILL_DIR/scripts/inspect-styled-system.mjs" path/to/styled-system

# or point at a project root containing styled-system/
PANDA_STYLED_SYSTEM=/abs/path/to/styled-system node "$SKILL_DIR/scripts/inspect-styled-system.mjs"
```

Run this once at the start of Panda work in an unfamiliar project; cite the real
tokens/recipe variants it prints instead of guessing.

## Locating the compiled output

- Default: `styled-system/` at project root (config `outdir`, default
  `"styled-system"`).
- Monorepos: often a workspace package, e.g. `packages/styled-system/`, imported
  via an alias or package name. Marker file to search for:
  `**/tokens/tokens.d.ts` (skip `node_modules`).
- Check `panda.config.ts` `outdir` and `tsconfig` path aliases (`styled-system/*`)
  if unsure.

## What each generated file tells you (read directly when you need detail)

| File | Authoritative answer to |
| --- | --- |
| `tokens/tokens.d.ts` | every token path. `export type ColorToken`, `SpacingToken`, `RadiusToken`, … unions = all legal values. Semantic tokens (`text`, `border`, `brand`) appear in the relevant category union. |
| `types/prop-type.d.ts` | the `textStyle:` union (= defined textStyles) and every utility's accepted values. |
| `types/conditions.d.ts` | every condition (`_hover`, `_dark`, custom ones) with the selector it compiles to (in the JSDoc comment). |
| `recipes/<name>.d.ts` | a config recipe's variant keys, allowed values, defaults (JSDoc `@default`), and slots (slot recipes). |
| `recipes/index.d.ts` | list of all config recipe names. |
| `patterns/index.d.ts` | all available patterns (built-in + custom). |
| `tokens/index.mjs` | raw resolved values (CSS vars + literals) if you need the actual color/space value, not just the name. |

### Grep recipes

```bash
SS=path/to/styled-system
# all color token names
grep -oE 'export type ColorToken = [^\n]+' "$SS/tokens/tokens.d.ts"
# defined textStyles
grep -E '\btextStyle:' "$SS/types/prop-type.d.ts"
# a recipe's variants
sed -n '1,60p' "$SS/recipes/button.d.ts"
# custom conditions only (non-default names)
grep -oE '"_[A-Za-z0-9]+":' "$SS/types/conditions.d.ts"
```

## Reading the preset / config source (intent + editing)

Source lives in the project, not styled-system. Common shapes:

- Single file: `panda.config.ts` with inline `theme`, `conditions`, etc.
- Preset package: `definePreset({...})` split across files, e.g.
  `colors.ts`, `semanticTokens.ts`, `conditions.ts`, `recipes.ts`,
  `textStyles.ts`, `keyframes.ts`, `patterns/`, then assembled in `index.ts`.

When editing the design system, change the **source** (preset / config), then
`panda codegen` to regenerate styled-system. Never hand-edit `styled-system/`.

Key source files to read for intent:
- `semanticTokens.*` — how `text`/`border`/`colorPalette` resolve and switch on
  conditions (light/dark, etc.).
- `colors.*` — raw palette values; whether Tailwind palette is kept or replaced.
- `conditions.*` — custom conditions and the selectors they map to.
- `textStyles.*` — composite text presets (`heading-xl`, …).
- `assets` token category (if present) — background-image / SVG data URLs usable
  as `bgImage="asset.name"`.

## User-defined / external design system

If the user points at a styled-system or design-system outside the current
project (a shared package, a path they give), pass that path to the inspector or
set `PANDA_STYLED_SYSTEM`. Treat that as the source of truth for token/recipe
names in the code you write, even if the current repo also has one.
