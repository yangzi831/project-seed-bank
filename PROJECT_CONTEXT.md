# Project Seed Bank - Development Handoff Context

Last updated: 2026-07-31

This document is a continuation handoff for future Codex sessions or development on another machine. It summarizes the actual current implementation, not just the product idea.

## 1. Project Positioning And Goal

Project Seed Bank is a personal project cultivation demo. The product metaphor is a creative garden where a user plants side projects, learning plans, creative ideas, prototypes, tools, and AI experiments as living plants.

The core experience is not a SaaS dashboard. It should feel like a quiet, artistic, digital botanical estate:

- A user enters a garden overview map.
- The map has five garden zones.
- Each project is represented by a plant.
- Projects grow through status changes.
- Logs and outcomes form a growth dossier for each project.
- Data is local-first for now, stored in `localStorage`.

Current product goal:

- Make the spatial navigation and project growth loop usable.
- Keep the visual language: deep green, translucent glass, cream text, luminous digital plants.
- Prepare the data and UI structure for later AI/Agent features.

## 2. Current Completed Features

Implemented:

- Vite + React + TypeScript project scaffold.
- Client-only app, no backend, no login, no AI calls yet.
- Manual route handling with History API:
  - `/garden`
  - `/plants`
  - `/board`
  - `/garden/:zoneId`
  - hidden dev route `/dev/plant-library`
  - legacy `/plant-library` redirects/normalizes to `/plants`.
- GitHub Pages deployment support with Vite production base `/project-seed-bank/`.
- SPA fallback generation via `dist/404.html`.
- Garden Overview page:
  - Uses `/images/garden/overview.png`.
  - Shows five Garden entrance markers on the map.
  - Shows project plant sprites on overview map.
  - Supports dragging overview plants by `overviewPosition`.
  - Supports status filtering.
  - Supports adding new project from overview.
  - Recently Planted panel.
- Zone Detail page:
  - Uses per-zone background image.
  - Shows zone canvas with project plants.
  - Supports dragging plants by `project.position`.
  - Supports adding projects into current or selected zone.
  - Supports quick garden switching.
- Project Detail modal:
  - Project title and description editing.
  - Current status.
  - Plant preview.
  - Growing/Mature plant state comparison.
  - Logs.
  - Outcomes.
  - Status advance.
  - Dormant / wake up.
  - Harvest.
  - Change plant through picker.
  - Delete project with confirm.
- Plants page:
  - Fixed plant library / plant atlas, not project list.
  - 24 plants.
  - Card grid intended as plant asset overview.
  - Mature image is the main visual; growing image is secondary.
- Board page:
  - Project status board grouped by:
    - `growing`
    - `mature`
    - `dormant`
    - `harvested`
  - Cards open project details.
  - Delete button available.
- Demo data:
  - Realistic personal project names, such as AI resume helper, portfolio refresh, interview question review bank.
  - Demo version migration through `DEMO_DATA_VERSION`.
- Plant import script:
  - Reads raw growing/mature images.
  - Generates normalized library assets and `src/data/plantLibrary.ts`.

## 3. Technical Stack

Runtime:

- Vite
- React 19
- TypeScript
- Plain CSS
- Browser `localStorage`

No current use of:

- Backend
- Login/auth
- Database
- AI API
- File upload
- UI component library
- WebGL / 3D

Important scripts in `package.json`:

```json
{
  "dev": "vite",
  "build": "tsc && vite build && node scripts/create-spa-fallback.mjs",
  "preview": "vite preview",
  "import:plants": "node scripts/import-plants.mjs"
}
```

Important files:

- `src/App.tsx`: app state, route parsing, navigation, CRUD handlers, modal mounting.
- `src/data/garden.ts`: domain types, default zones, localStorage load/save, demo data, project creation, normalization, plant asset lookup.
- `src/data/plantLibrary.ts`: generated plant atlas data.
- `src/views/HomeView.tsx`: Garden Overview.
- `src/views/ZoneView.tsx`: single garden zone.
- `src/views/ListView.tsx`: Plants/Board shared view logic.
- `src/views/PlantLibraryView.tsx`: hidden dev plant import checker route.
- `src/views/ProjectDetailView.tsx`: project growth dossier modal.
- `src/components/PlantSprite.tsx`: plant image/fallback rendering.
- `src/components/DraggablePlant.tsx`: click vs drag plant positioning.
- `src/components/CanvasStage.tsx`: image stage wrapper that keeps map image rect aligned with overlays.
- `src/components/PlantPicker.tsx`: reusable plant selector.
- `src/utils/publicPath.ts`: converts `/images/...` into GitHub Pages-compatible paths in production.
- `src/style.css`: all visual styling and responsive layout.

## 4. Page Structure

Top navigation:

- Garden
- Plants
- Board

Routes:

- `/` and `/garden`: Garden Overview.
- `/plants`: Plants / plant atlas page.
- `/board`: project growth board.
- `/garden/flower`: Garden 01 / 花园区.
- `/garden/water`: Garden 02 / 水镜区.
- `/garden/exhibition`: Garden 03 / 展园区.
- `/garden/woodland`: Garden 04 / 林地区.
- `/garden/experiment`: Garden 05 / 实验区.
- `/dev/plant-library`: hidden development checker page for imported plant pairs.
- `/plant-library`: should not show the old public dev page; treated as `/plants`.

Garden Overview current information priority:

1. Garden Overview title.
2. Garden map.
3. Garden entrance navigation.
4. Recently Planted.
5. Statistics.

Important responsive rule:

- Desktop `>=1200px`: keep current left sidebar + main canvas layout.
- Tablet `768-1199px`: do not place sidebar before main content; Garden Overview and map must appear first.
- Mobile `<768px`: single-column order should be Header, Garden Overview, Garden Map, Garden Navigation, Recently Planted, Statistics.

## 5. Data Structure

Main types live in `src/data/garden.ts`.

Project status:

```ts
export type ProjectStatus = 'growing' | 'mature' | 'dormant' | 'harvested'
```

Plant category:

```ts
export type PlantCategory = 'flower' | 'green' | 'tree' | 'uncategorized'
```

Project:

```ts
export type ProjectSeed = {
  id: string
  title: string
  description: string
  zoneId: ZoneKey
  status: ProjectStatus
  previousStatus?: Exclude<ProjectStatus, 'dormant'>
  plantCategory: PlantCategory
  plantVariant?: string
  position: { x: number; y: number }
  overviewPosition: { x: number; y: number }
  overviewPositionManual?: boolean
  logs: GrowthLog[]
  outcomes: Outcome[]
  createdAt: string
  updatedAt: string
}
```

Growth log:

```ts
export type GrowthLog = {
  id: string
  text: string
  createdAt: string
}
```

Outcome:

```ts
export type Outcome = {
  id: string
  title: string
  type: 'link' | 'text' | 'image' | 'file'
  value: string
  createdAt: string
}
```

Garden state:

```ts
export type GardenState = {
  zones: Zone[]
  projects: ProjectSeed[]
  demoDataVersion?: string
}
```

Storage:

- Current key: `project-seed-bank:v2`
- Legacy key: `project-seed-bank:v1`
- Demo version: `demo-projects-v2-realistic-names`

Migration behavior:

- `loadGardenState()` loads v2 first, then v1.
- If `demoDataVersion` is missing or different, demo projects are regenerated with `createMockProjects()`.
- Legacy `sprout` status is normalized to `growing`.
- Missing positions, plant variants, outcomes, and logs are normalized.

Status advance:

```ts
growing -> mature -> harvested
```

Dormant can be entered from any active status. `previousStatus` is used to wake back to the prior growing/mature state where possible.

## 6. Plant System Design

The current plant system uses real transparent PNG assets.

Asset folders:

- Raw import source:
  - `public/images/plants/raw/growing/`
  - `public/images/plants/raw/mature/`
- Generated app library:
  - `public/images/plants/library/`

Generated final naming:

- `plant-01-growing.png`
- `plant-01-mature.png`
- ...
- `plant-24-growing.png`
- `plant-24-mature.png`

Generated manifest:

- `src/data/plantLibrary.ts`

Plant library item:

```ts
export type PlantLibraryItem = {
  id: string
  name: string
  englishName: string
  chineseName: string
  key: string
  category: PlantCategory
  growing: string
  mature: string
}
```

Import script:

```bash
npm run import:plants
```

Script behavior:

- Reads `.png` files from raw growing and mature folders.
- Sorts by leading number, so `10` does not come before `2`.
- Pairs growing N with mature N.
- Copies and renames into `public/images/plants/library`.
- Regenerates `src/data/plantLibrary.ts`.
- Adds English and Chinese names.
- Category is inferred from filenames, with overrides such as `plant-06` / Pearl Stem / 珠光茎 as `green`.

Display behavior:

- `PlantSprite` uses `getPlantAssetPath(project)`.
- `growing` projects show growing image.
- `mature` projects show mature image.
- `harvested` uses mature image plus badge.
- `dormant` uses the current/restorable stage but visually dimmed.
- If a plant asset is missing, fallback CSS particle plant is shown.
- `publicPath()` must be used for `/images/...` paths so GitHub Pages production base works.

Current visual caveat:

- Plant PNGs have large transparent margins. Detail modal uses wrapper + image scale to make the plant body occupy a reasonable amount of the display area without editing original PNG files.

## 7. Five Garden Zones

Default zones are defined in `src/data/garden.ts`.

Garden 01:

- `id`: `flower`
- Default name: `Garden 01`
- Chinese subtitle: `花园区`
- Image: `/images/garden/zone-flower.png`
- Concept: aesthetics, delicate work, personal expression, creative care.

Garden 02:

- `id`: `water`
- Default name: `Garden 02`
- Chinese subtitle: `水镜区`
- Image: `/images/garden/zone-water.png`
- Concept: reflection, records, research, long-term observation.

Garden 03:

- `id`: `exhibition`
- Default name: `Garden 03`
- Chinese subtitle: `展园区`
- Image: `/images/garden/zone-exhibition.png`
- Concept: projects becoming presentable, portfolio/display, narrative polish.

Garden 04:

- `id`: `woodland`
- Default name: `Garden 04`
- Chinese subtitle: `林地区`
- Image: `/images/garden/zone-woodland.png`
- Concept: systems, archives, accumulating materials, long-lived structures.

Garden 05:

- `id`: `experiment`
- Default name: `Garden 05`
- Chinese subtitle: `实验区`
- Image: `/images/garden/zone-experiment.png`
- Concept: uncertain prototypes, fast experiments, AI tools, allowed failure.

Overview map:

- Image: `/images/garden/overview.png`
- Garden entrance markers are positioned in `HomeView.tsx`.
- Initial overview plant placement uses zone-specific slots/ranges.
- User drag changes `project.overviewPosition` and sets `overviewPositionManual: true`.

## 8. GitHub Pages Deployment

Repository:

- `https://github.com/yangzi831/project-seed-bank`

Production URL:

- `https://yangzi831.github.io/project-seed-bank/`

Deployment:

- GitHub Pages with GitHub Actions.
- Settings -> Pages source should be GitHub Actions.

Workflow:

- `.github/workflows/deploy.yml`

Workflow uses:

- `actions/checkout@v4`
- `actions/setup-node@v4`
- `actions/configure-pages@v5`
- `actions/upload-pages-artifact@v3`
- `actions/deploy-pages@v4`

Permissions:

```yaml
permissions:
  contents: read
  pages: write
  id-token: write
```

Vite base:

```ts
base: process.env.NODE_ENV === 'production' ? '/project-seed-bank/' : '/'
```

SPA fallback:

- `npm run build` runs `scripts/create-spa-fallback.mjs`.
- It copies `dist/index.html` to `dist/404.html`.
- This avoids 404 when refreshing frontend routes on GitHub Pages.

Image path rule:

- Source data can use `/images/...`.
- Rendering components should pass image paths through `publicPath()`.
- Do not use `src/assets` for garden/plant public images.
- Deployed image example:
  - `https://yangzi831.github.io/project-seed-bank/images/garden/overview.png`
  - `https://yangzi831.github.io/project-seed-bank/images/plants/library/plant-01-growing.png`

## 9. Current Known Bugs / Risks

Known or recently addressed:

- Tablet/mobile Garden page ordering has been problematic: sidebar/recent content could appear before Garden Overview and map. Recent local changes are intended to reorder `HomeView` DOM and responsive layout, but this should be visually rechecked on actual tablet/mobile widths.
- Plant detail modal previously showed plants too small due to transparent PNG margins. Current local changes add wrapper + scale in detail preview; verify across several plant IDs.
- Local working tree may contain uncommitted UI fixes in:
  - `src/style.css`
  - `src/views/HomeView.tsx`
  - `src/views/ProjectDetailView.tsx`
- Mobile visual QA is still needed after each responsive change.
- Plant library raw files are tracked in git along with generated library files. This is okay for demo, but repository size should be watched if assets grow.
- There is no backend conflict resolution. `localStorage` state is per browser/device.
- Demo data refresh intentionally overwrites demo projects when `DEMO_DATA_VERSION` changes. Good for demo phase, risky for real users.
- Manual router is simple and adequate now, but can become fragile as route complexity grows.
- Hidden `/dev/plant-library` still exists for checking imports. It should remain hidden from normal navigation.

Do not regress:

- Desktop `>=1200px` Garden layout is considered correct by the user.
- Plants page should remain a fixed 24-plant atlas, not a project list.
- Board page should remain the project status board.
- Overview page should show plants without project text labels, plus Garden entrance markers.
- Single Garden page should show project-level labels.
- New project and Change Plant flows must use explicit plant picker, not random-only switching.

## 10. Next Stage Plan: AI And Agent Features

The next phase should add intelligence carefully without turning the app into a generic AI dashboard.

Suggested AI feature roadmap:

1. Project Seed Assistant
   - Help user turn a rough idea into a project seed.
   - Output: title, one-line description, suggested zone, suggested plant category, initial next steps.
   - Keep user editable before saving.

2. Growth Log Summarizer
   - Summarize logs into current project state.
   - Detect blockers, momentum, next action.
   - Add an optional generated progress note.

3. Status Recommendation
   - Suggest whether a project should stay growing, become mature, go dormant, or be harvested.
   - Do not auto-change status without confirmation.

4. Outcome Assistant
   - Convert outcomes/links/logs into a portfolio blurb, release note, or short showcase text.

5. Garden Overview Insight
   - Analyze all projects locally or via an API.
   - Show gentle insights such as:
     - too many dormant projects in one zone
     - many growing projects but few harvested
     - areas with no recent activity

Suggested Agent roadmap:

1. Weekly Garden Keeper Agent
   - Checks projects weekly.
   - Asks which projects moved.
   - Suggests logs or next actions.

2. Project Research Agent
   - Given a project seed, collect references, competitor links, tutorials, examples.
   - Store as outcomes or logs.

3. Portfolio Harvest Agent
   - When status is harvested, help package the project:
     - summary
     - screenshots checklist
     - publish plan
     - portfolio entry draft

4. File/Link Organizing Agent
   - Later, when file upload or local file indexing exists, attach related files to project outcomes.

Implementation notes for AI/Agent phase:

- Add a backend or serverless function before putting any API key in production.
- Never expose API keys in Vite client env.
- Keep AI suggestions as drafts; user confirms changes.
- Preserve the garden metaphor: AI should feel like a gardener/curator, not a chat panel bolted onto the UI.
- Consider extending `ProjectSeed` later with:
  - `aiSummary?: string`
  - `nextActions?: string[]`
  - `tags?: string[]`
  - `references?: Outcome[]`
  - `lastAgentReviewAt?: string`
  - `agentNotes?: GrowthLog[]`

## Quick Start For New Machine

```bash
git clone https://github.com/yangzi831/project-seed-bank.git
cd project-seed-bank
npm install
npm run dev
```

Build:

```bash
npm run build
```

Import plants after replacing raw assets:

```bash
npm run import:plants
```

Then commit generated:

- `public/images/plants/library/*.png`
- `src/data/plantLibrary.ts`

## Current Development Rules

- Keep UI artistic, natural, glassy, and spatial.
- Avoid generic admin dashboard patterns.
- Avoid large tables.
- Avoid heavy black panels over the map.
- Do not reintroduce `sprout` as a primary status.
- Do not replace the Plants page with project cards.
- Do not remove localStorage persistence.
- Do not break GitHub Pages base path handling.
- Do not commit `node_modules`, `dist`, `.env`, or secrets.
