# Panda CSS — Claude Code Plugin

A Claude Code skill that gives Claude expert knowledge of [Panda CSS](https://panda-css.com): build-time CSS-in-JS, `css()`/`cva`/`sva`, config recipes, patterns, tokens, and the CLI workflow. Backed by the full upstream `llms-full.txt` reference with progressive disclosure (Claude loads only the sections it needs).

## Install

In Claude Code:

```
/plugin marketplace add <owner>/<repo>
/plugin install panda-css@panda-css-marketplace
```

Replace `<owner>/<repo>` with this repository (e.g. `leonvandernoll/panda-css-skill`).

Once installed, the skill is available as `/panda-css:panda-css` and Claude will invoke it automatically when you work with Panda CSS.

## What's inside

```
.claude-plugin/marketplace.json     marketplace manifest
plugins/panda-css/
  .claude-plugin/plugin.json        plugin manifest
  skills/panda-css/
    SKILL.md                        the skill (core API, config, CLI, debugging)
    reference/
      llms-full.txt                 full Panda CSS docs
      INDEX.txt                     header → line map for targeted reads
```

## Updating the reference

Refresh `reference/llms-full.txt` from <https://panda-css.com/llms-full.txt> and regenerate `INDEX.txt`, then bump `version` in `plugin.json`.
