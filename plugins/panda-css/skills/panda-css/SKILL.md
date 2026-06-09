---
name: panda-css
description: >-
  Reference and usage guide for Panda CSS, the build-time CSS-in-JS framework
  (css(), recipes/cva, slot recipes/sva, patterns, design tokens, semantic
  tokens, conditions, config, codegen). Use when writing or editing Panda CSS
  styles, configuring panda.config, defining recipes/tokens/patterns, debugging
  why styles aren't applied, or setting up Panda in a project.
---

# Panda CSS

Build-time CSS-in-JS. Authoring functions live in a generated `styled-system/`
folder produced by `panda codegen`. Zero runtime: styles extracted to static CSS
at build.

## When this skill applies

Any work touching Panda: `css()` calls, `cva`/`sva` recipes, patterns
(`stack`, `hstack`, `grid`...), `panda.config.ts`, tokens/semanticTokens,
conditions (`_hover`, `md`, `_dark`), JSX style props (`styled`, `Box`), or
"styles not showing up" debugging.

## Core API (memorize, verified against latest docs)

Imports come from the **generated** `styled-system/` dir (alias `styled-system/*`
or relative `../styled-system/*`):

```ts
import { css, cx } from 'styled-system/css'
import { stack, hstack, grid } from 'styled-system/patterns'
import { styled, Box, Stack } from 'styled-system/jsx'
import { button } from 'styled-system/recipes'   // your config recipes
import { token } from 'styled-system/tokens'
```

- `css({ color: 'red.300', _hover: { color: 'red.500' }, md: { fontSize: 'lg' } })`
  → returns a class string. Object keys = style props + conditions.
- `cx(a, b)` — merge class strings (conflict-aware).
- **Atomic recipe** `cva({ base, variants, compoundVariants, defaultVariants })`
  — inline, tree-shaken per used variant. Import `cva` from `styled-system/css`.
- **Config recipe** `defineRecipe(...)` in config under `theme.recipes` →
  generates a function in `styled-system/recipes`. Use for shared components.
- **Slot recipe** `sva` (inline) / `defineSlotRecipe` (config) for multi-part
  components (`theme.slotRecipes`).
- **Patterns** = layout helpers: `stack`, `hstack`, `vstack`, `grid`,
  `gridItem`, `flex`, `wrap`, `container`, `center`, `aspectRatio`, `divider`,
  `float`, `bleed`, `visuallyHidden`, `cq`. Custom via `definePattern`.
- **JSX**: `styled.div`, `styled('a', recipe)`, factory `Box`, `Stack`, etc.

## Config (`panda.config.ts`)

```ts
import { defineConfig } from '@pandacss/dev'
export default defineConfig({
  preflight: true,                 // CSS reset
  include: ['./src/**/*.{ts,tsx,js,jsx}'],
  exclude: [],
  theme: { extend: { tokens: {}, semanticTokens: {}, recipes: {}, keyframes: {} } },
  jsxFramework: 'react',           // enables styled JSX factory
  outdir: 'styled-system',
})
```

- **`extend`** keyword merges with Panda defaults; omitting it *overrides* them.
  Forgetting `extend` is the #1 "my preset disappeared" cause.
- Tokens: `tokens` = raw values; `semanticTokens` = values that switch on
  conditions (e.g. light/dark). Reference as `{colors.brand}` or `colorPalette`.

## Workflow / CLI

- `panda init -p` — scaffold config + postcss.
- `panda codegen` — regenerate `styled-system/` after config changes.
- `panda cssgen` — emit static CSS. `panda --watch` during dev.
- `panda studio` — visual token/recipe explorer.
- `panda debug` — dump extracted styles for a file (use when styles missing).
- `panda analyze` — usage report.

## Debugging "styles not applied" (common)

1. File not in config `include` glob → not scanned. Fix glob.
2. Used a **dynamic/runtime** value (`css({ color: someVar })`) — Panda is
   static-extraction; only statically-analyzable values work. Use recipes or
   token maps instead.
3. Forgot `@layer` setup in entry CSS (`@layer reset, base, tokens,
   recipes, utilities;`) or missing `@layer` directives.
4. Stale codegen → rerun `panda codegen`.
5. Run `panda debug <file>` to see what got extracted.

## Deep reference (on demand — do NOT load wholesale)

Full docs: `reference/llms-full.txt` (~21k lines). Header→line map:
`reference/INDEX.txt`.

To pull a section: find header in `INDEX.txt`, then read that line range, e.g.
`sed -n '385,406p' reference/llms-full.txt` or the Read tool with `offset`.
Categories in order: Overview, Installation (per framework), Concepts, Theming,
Utilities, Customization, Guides, Migration, References.

Grep for a topic: `grep -n '^## ' reference/llms-full.txt | grep -i recipe`.

Always prefer reading the reference over guessing API surface for less-common
features (utilities, jsx patterns, migration, framework-specific setup).
