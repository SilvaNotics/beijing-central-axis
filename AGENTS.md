# Project instructions

## Important: Research records and source maintenance

**Research documentation forms part of the project deliverables and competition defense materials. Any improvements involving historical facts, landmark layouts, architectural forms, or geographic data must include corresponding updates to the supporting evidence and modeling decisions; these must not remain only in chat history or code comments.**

- Before starting relevant improvements, read the corresponding entries in the [research overview](docs/research/README.md) and [landmark evidence matrix](docs/research/evidence-matrix.md), and verify evidence using the existing source IDs. Prioritize the documented evidence gaps to avoid duplicate searches or reusing conclusions that have already been corrected.
- When adding or rechecking material, update both the [structured source register](docs/research/source-register.json) and the [source catalogue](docs/research/source-catalogue.md). Preserve stable IDs and deduplicate by URL. Record the institution or author, title, link, actual access or verification date, specific conclusions supported, and limitations. Include PDF page numbers where possible; for images, include the author, license, and original source. Explicitly mark missing information as pending rather than inventing it.
- For each significant adjustment, explain in the [landmark evidence matrix](docs/research/evidence-matrix.md) what evidence supports it, what changed, why that representation was chosen, and what remains missing. Link the source IDs and implementation files. Strictly distinguish textual facts, map geometry, photographic observations, and model interpretations. Estimated dimensions, inferred buildings, simplified details, and navigation adjustments must not be described as measured data or precise historical reconstructions.
- Prioritize heritage institutions, cultural heritage authorities, museums, and reliable academic material for cultural facts. Map outlines, POI labels, and photographs each support only what they can establish. When sources conflict, retain the differing accounts, the reason for adopting one, and the points still requiring verification. Do not rewrite facts to fit the current model.
- When coordinate transformations, data filtering, layout derivation, or research methods change, update the [research methodology and data provenance](docs/research/methodology.md). When updating data snapshots, retain traceable queries, acquisition dates, coordinate systems, and licensing information, and recalculate the corresponding counts, sizes, and hashes in the [data snapshot manifest](docs/research/data-manifest.json). Do not treat POIs as building footprints or mix coordinate systems.
- Significant visual corrections may be archived in the [model verification gallery](docs/research/figures/README.md), identifying the subject checked, version or generation time, observations, and limitations. Clearly distinguish screenshots of the project's models from real-world reference photographs. Check licensing before using external images, and do not label intermediate screenshots as final acceptance evidence.
- Compiling research does not mean every source page was verified online during the current round. Preserve the actual verification status, secondary citation relationships, and gaps in original-source archiving. Do not exaggerate search volume, source coverage, or model completeness. After adding material, update the statistics and outstanding items in the research overview. Retain historical notes for outdated conclusions and link to their replacement records.
- Before completing relevant improvements, check that source IDs, document links, and data records are consistent, and accurately record the validation actually performed. For competition delivery, add the final commit ID, build and browser check results, and corresponding screenshots so that presented conclusions can be traced to a specific version.

## Scope and agreed product

Build a Chinese-language Beijing Central Axis web atlas with a cinematic Three.js geographic overview, landmark information, three independently replaceable chapter entries, and a separate sample page. The parent application uses React, TypeScript, and Vite. The overview uses an afternoon-to-dusk palette with recognizable geographic relationships, surrounding roads and water, and a clear north–south axis.

- Preserve the boundary between the overview shell and teammates’ chapter projects. The default contract is an iframe URL; React, Vue, and vanilla chapter builds are all acceptable.
- Chapter entries live in `src/data/heritage.ts`. Preserve IDs and URL contracts when replacing content. See `docs/integration.md`.
- `public/chapters/north/` contains the formal paper-cut chapter and `public/chapters/south/` contains the formal ink-map chapter. `central/` remains a **regional integration example**. The south chapter is a standalone creative interpretation; see its handoff and research notes for content and asset limitations.
- North covers Jingshan, the Bell and Drum Towers, and Wanning Bridge. Central covers the Forbidden City, the Altar of Land and Grain (Shejitan), the Imperial Ancestral Temple (Taimiao), Duanmen Gate, and the Outer Golden Water Bridges. South covers Tiananmen Gate Tower, Tiananmen Square and its architectural ensemble, Zhengyangmen Gate, the Temple of Heaven (Tiantan), the Altar of Agriculture (Xiannongtan), the Southern Section Road Remains of the Central Axis, and Yongdingmen Gate.
- Use sourced descriptions and keep factual references with the landmark data/research notes. Schematic geometry is an interpretation for navigation; never describe it as an exact surveyed model or historical reconstruction.
- Bundle fonts and runtime assets locally, or use system fonts. The completed local build must not depend on CDN scripts, remote fonts, or online map tiles. No runtime AI/chat/generation feature is in scope.

## Shell and runtime

Identify the environment before every shell command.

- **Inside WSL:** use the WSL Bash shell. This workspace is `/mnt/e/Workbook/BeijingCentralAxis`; do not invoke Windows Git Bash from WSL.
- **On Windows outside WSL:** use Git Bash at `C:\Program Files\Git\bin\bash.exe` directly as the execution shell. Do not wrap each Bash command in PowerShell. Use PowerShell only for a Windows-native requirement or when Git Bash cannot reliably complete the task.
- Node.js **v24.20.0** is already available through fnm in this environment. Initialize fnm for the current shell/PATH when necessary; do not reinstall Node to solve an uninitialized PATH.
- GitHub CLI (`gh`) is installed and authenticated in the WSL environment (verified on 2026-11-13; version 2.104.0). Use it for authorized GitHub operations such as pull requests and check inspection. Do not repeat installation or login unless an actual availability or authentication error occurs. Authentication does not itself authorize pushing, merging, or publishing; follow the user's task authorization.
- Prefer `rg` / `rg --files` for searches. Use `npm install`, `npm run dev`, `npm run build`, `npm test`, and `npm run test:e2e` as documented in the README.

## Collaboration and verification

- The authorized working branch is `codex/axis-atlas`; automatic local commits are authorized. Publishing, pushing, and external deployment are not required for this task.
- Inspect the working tree first. Preserve unrelated work and coworkers’ modules, chapter content, and registered entries. Avoid destructive resets, broad rewrites, or staging unrelated changes.
- Keep fixes in the owning module; communicate contract changes before modifying another contributor’s files. Agents working in a shared tree must not run branch-switching or commit operations concurrently.
- Verify data, navigation, and build behavior with the existing checks. Test the visible result in a browser when available, including narrow layouts, keyboard focus, iframe return, and independent chapter opening. Do not claim checks ran without their actual output.
- User instructions and existing authorization take precedence over advisory skill workflows. Ordinary local edits, read-only inspection, and testing interactions within the requested product do not introduce an extra approval step.

## Repository-local skills

The requested skills are vendored into `.agents/skills/` from the already installed `agent-skills` 0.6.10 package so Codex can discover them. Keep repository-local skills, their license, and shared references together in `.agents/`.

- UI: `.agents/skills/frontend-ui-engineering/SKILL.md`
- Runtime QA: `.agents/skills/browser-testing-with-devtools/SKILL.md`
- Version control: `.agents/skills/git-workflow-and-versioning/SKILL.md`

Read the relevant skill before using it. The frontend skill’s `../../references/accessibility-checklist.md` resolves to `.agents/references/accessibility-checklist.md`. Read `.agents/README.md` for source attribution and local adaptation. Use available host browser tools; the browser skill’s sample MCP configuration is a reference, not a requirement to install a service.

## Teammates' independent chapter projects

Before scaffolding, building, or integrating the north, central, or south teammate chapter, read [CHAPTER_AGENT_GUIDE.md](CHAPTER_AGENT_GUIDE.md). It defines the recommended toolchain, independent project structure, stable region/site IDs, iframe contract, and delivery checks. Chapter content and visual design remain each teammate's decision. The overview is already established; keep chapter work within its integration boundary. For a separate chapter repository, copy or reference that guide from its own root `AGENTS.md` so the receiving Agent can discover it.
