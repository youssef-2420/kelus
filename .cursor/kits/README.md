# Cursor UI/UX kits (vendor mirror)

Downloaded design kits for Kelus. **Active installs** live in:

- `.cursor/skills/` — Cursor agent skills (UI UX Pro Max bundle)
- `.agents/skills/` — universal agent skills
- `.cursor/rules/design/` — Cursor Designer rules
- `.cursor/rules/design-bible/` — Design Bible rules
- `.cursor/ui-ux-kit/SKILL.md` — master index (start here)

## Vendored repositories

| Kit | Repo | Size | Role |
|-----|------|------|------|
| **UI Design Brain** | [carmahhawwari/ui-design-brain](https://github.com/carmahhawwari/ui-design-brain) | ~50KB | 60+ component patterns from component.gallery |
| UI UX Pro Max | [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | ~30MB | Design intelligence DB + search scripts |
| Impeccable | [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | ~104MB | Polish, audit, animate, onboard |
| Hallmark | [Nutlope/hallmark](https://github.com/Nutlope/hallmark) | ~32MB | Anti-AI-slop, macrostructure |
| Cursor Designer | [spencergoldade/cursor-designer](https://github.com/spencergoldade/cursor-designer) | ~460KB | UX/UI/IA/a11y `.mdc` rules |
| Design Bible | [saralobo/rules-design-bible](https://github.com/saralobo/rules-design-bible) | ~664KB | UX laws, gestalt, anti-patterns |

Large vendor clones (`impeccable`, `hallmark`, `ui-ux-pro-max-skill`) are gitignored. Re-clone with:

```bash
cd .cursor/kits
git clone --depth 1 https://github.com/nextlevelbuilder/ui-ux-pro-max-skill.git
git clone --depth 1 https://github.com/pbakaus/impeccable.git
git clone --depth 1 https://github.com/Nutlope/hallmark.git
```

## Refresh active skills

```bash
# UI Design Brain
git clone --depth 1 https://github.com/carmahhawwari/ui-design-brain.git .cursor/skills/ui-design-brain

# UI UX Pro Max (recommended)
npx -y ui-ux-pro-max-cli init --ai cursor
npx -y ui-ux-pro-max-cli init --ai universal

# Hallmark
npx skills add nutlope/hallmark

# Impeccable
npx impeccable install --providers cursor --scope project
```

## Copy rules after updating vendor mirrors

```bash
cp kits/cursor-designer/.cursor/rules/core/*.mdc .cursor/rules/design/
cp kits/cursor-designer/.cursor/rules/frontend/*.mdc .cursor/rules/design/
cp kits/rules-design-bible/.cursor/rules/*.mdc .cursor/rules/design-bible/
```
