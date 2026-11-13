# Project instructions

## Scope and agreed product

Build a Chinese-language Beijing Central Axis web atlas with a cinematic Three.js geographic overview, landmark information, three independently replaceable chapter entries, and a separate sample page. The parent application uses React, TypeScript, and Vite. The overview uses an afternoon-to-dusk palette with recognizable geographic relationships, surrounding roads and water, and a clear north–south axis.

- Preserve the boundary between the overview shell and teammates’ chapter projects. The default contract is an iframe URL; React, Vue, and vanilla chapter builds are all acceptable.
- Chapter entries live in `src/data/heritage.ts`. Preserve IDs and URL contracts when replacing content. See `docs/integration.md`.
- `public/chapters/north/`, `central/`, and `south/` contain **分区接入示例**, not the final authored chapters. Do not present them as final teammate work.
- North covers 景山、钟鼓楼、万宁桥. Central covers 故宫、社稷坛、太庙、端门、外金水桥. South covers 天安门城楼、天安门广场及建筑群、正阳门、天坛、先农坛、中轴南段道路遗存、永定门.
- Use sourced descriptions and keep factual references with the landmark data/research notes. Schematic geometry is an interpretation for navigation; never describe it as an exact surveyed model or historical reconstruction.
- Bundle fonts and runtime assets locally, or use system fonts. The completed local build must not depend on CDN scripts, remote fonts, or online map tiles. No runtime AI/chat/generation feature is in scope.

## Shell and runtime

Identify the environment before every shell command.

- **Inside WSL:** use the WSL Bash shell. This workspace is `/mnt/e/Workbook/BeijingCentralAxis`; do not invoke Windows Git Bash from WSL.
- **On Windows outside WSL:** use Git Bash at `C:\Program Files\Git\bin\bash.exe` directly as the execution shell. Do not wrap each Bash command in PowerShell. Use PowerShell only for a Windows-native requirement or when Git Bash cannot reliably complete the task.
- Node.js **v24.20.0** is already available through fnm in this environment. Initialize fnm for the current shell/PATH when necessary; do not reinstall Node to solve an uninitialized PATH.
- Prefer `rg` / `rg --files` for searches. Use `npm install`, `npm run dev`, `npm run build`, `npm test`, and `npm run test:e2e` as documented in the README.

## Collaboration and verification

- The authorized working branch is `codex/axis-atlas`; automatic local commits are authorized. Publishing, pushing, and external deployment are not required for this task.
- Inspect the working tree first. Preserve unrelated work and coworkers’ modules, chapter content, and registered entries. Avoid destructive resets, broad rewrites, or staging unrelated changes.
- Keep fixes in the owning module; communicate contract changes before modifying another contributor’s files. Agents working in a shared tree must not run branch-switching or commit operations concurrently.
- Verify data, navigation, and build behavior with the existing checks. Test the visible result in a browser when available, including narrow layouts, keyboard focus, iframe return, and independent chapter opening. Do not claim checks ran without their actual output.
- User instructions and existing authorization take precedence over advisory skill workflows. Ordinary local edits, read-only inspection, and testing interactions within the requested product do not introduce an extra approval step.

## Repository-local skills

The requested skills are vendored into the singular `.agent/` directory from the already installed `agent-skills` 0.6.10 package. Do not modify or relocate a pre-existing `.agents/` directory.

- UI: `.agent/skills/frontend-ui-engineering/SKILL.md`
- Runtime QA: `.agent/skills/browser-testing-with-devtools/SKILL.md`
- Version control: `.agent/skills/git-workflow-and-versioning/SKILL.md`

Read the relevant skill before using it. The frontend skill’s `../../references/accessibility-checklist.md` resolves to `.agent/references/accessibility-checklist.md`. Read `.agent/README.md` for source attribution and local adaptation. Use available host browser tools; the browser skill’s sample MCP configuration is a reference, not a requirement to install a service.
