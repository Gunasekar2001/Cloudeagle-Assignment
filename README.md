# Advanced Editable Data Table

Live Link: https://cloudeagle-assignment-guna.netlify.app/

A data-intensive, inline-editable React table built for **10,000+ rows**. It combines inline editing (with per-row save / cancel / undo), **`react-window` virtual scrolling** (plus a pagination fallback), global search, multi-column sorting, per-column filtering, row selection with bulk actions, add/delete rows, column show/hide, light & dark themes, adjustable density, and **five export formats**. The whole app **fits the viewport** — only the table's row region scrolls, never the page.

Built with **React 18 + TypeScript (strict) + Vite**, `react-window` for virtualization, custom CSS, and a Context + reducer state layer.

![React](https://img.shields.io/badge/React-18-61dafb) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6) ![virtualization](https://img.shields.io/badge/virtualization-react--window-22c55e) ![bundle](https://img.shields.io/badge/JS-~59kB%20gzip-8b5cf6)

---

## Quick start

Requires Node 18+.

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server with HMR |
| `npm run build` | Type-check (`tsc`) **and** build the production bundle to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Type-check only, no emit |

---

## Deploy to Netlify

The repo ships with a `netlify.toml`, so deployment needs no extra config.

**Option A — connect the Git repo (recommended)**

1. Push this project to GitHub/GitLab/Bitbucket.
2. In Netlify: **Add new site → Import an existing project**, pick the repo.
3. Netlify reads `netlify.toml` automatically:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node 20, plus a SPA redirect so deep links never 404.
4. **Deploy**. Every push to the default branch redeploys.

**Option B — Netlify CLI / drag-and-drop**

```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod --dir=dist
```

Or run `npm run build` and drag the resulting `dist/` folder onto the Netlify dashboard.

> The app is a fully static SPA — it also deploys as-is to Vercel, GitHub Pages, Cloudflare Pages, or any static host. Point the host at build command `npm run build` and output dir `dist`.

---

## Features

### Editing
- **Inline editing** of text, numeric, and dropdown (`select`) fields. Double-click a row or press the **Edit** (pencil) button.
- **Save / Cancel / Undo per row.** Save commits (or <kbd>Enter</kbd>); Cancel discards (or <kbd>Esc</kbd>); **Undo** reverts the most recent *saved* change, backed by a full per-row undo history stack.
- **Add row** — prepends a blank row already in edit mode.
- **Delete row** — per-row delete, plus **bulk delete** of all selected rows.
- Numeric inputs reject invalid (non-numeric) entry; modified rows are highlighted and counted; salary renders as currency.

### Large-dataset performance
- **10,000 rows** by default, deterministically generated (seeded PRNG) so the data is identical on every reload.
- **Virtual scroll** (default) — powered by **`react-window`** (`FixedSizeList`). Only the rows intersecting the viewport (plus overscan) are mounted, so the DOM stays at a few dozen nodes at any dataset size (10k, 100k…).
- **Viewport-fit layout** — the app fills `100dvh`; the header, toolbar, summary and pagination are fixed-size while the row region flexes to fill the rest. The list height is measured with a `ResizeObserver` and handed to `react-window`, so **only the rows scroll — the page itself never does.**
- **Paginated** fallback — selectable page sizes (25 / 50 / 100 / 200) with first/prev/next/last controls.

### Find, sort & filter
- **Global search** across every visible column (case-insensitive substring).
- **Multi-column sort** — click a header to cycle asc → desc → off; **Shift-click** to build a multi-column sort with visible precedence badges.
- **Per-column filters** — substring for text; operator expressions for numbers (`>100`, `>=100`, `<50`, `=42`, range `10-20`).
- **Clear filters** resets search + all column filters at once.

### Export (5 formats)
CSV · JSON · Excel (`.xls`) · **Copy to clipboard** (TSV, paste straight into Sheets/Excel) · **Print / Save as PDF**. Exports respect the current search/filter/sort **and** column visibility, and can be scoped to **selected rows only**.

### Responsive — works on every screen
- **Desktop / laptop** — columns are **fluid** (`minmax(min, fr)` grid tracks) and expand to fill the viewport, so the whole table fits with **no horizontal scrolling**.
- **Phones & small tablets (≤ 880px)** — the wide grid is automatically swapped for a **stacked card layout**: each record becomes a tidy card with an identity header, a label/value grid, and the same edit / undo / delete actions. A compact sort + select-all bar replaces the column header. Drops to a single-column card grid under 480px.
- The same virtual scroller powers both layouts, so performance holds at 10k rows on mobile too.

### UI / UX
- **Light & dark themes** and **comfortable / compact density**, both persisted to `localStorage`.
- **Column show/hide** menu, **row selection** with select-all-in-view (indeterminate state), a **live stats summary bar** (row count, avg salary, total quantity, avg performance, active count), and toast feedback for actions.
- **Unsaved-changes guard** — a `beforeunload` prompt fires if a row editor is still open when you try to leave.
- Accessibility: ARIA `table`/`row`/`cell`/`columnheader` roles, labelled inputs, full keyboard support in editors, visible focus rings, and keyboard-dismissable menus.

---

## How it works

### Architecture at a glance

```
App.tsx                      generates 10k rows (once), mounts the provider
└─ TableProvider             Context wrapping a useReducer store
   └─ DataTable              orchestrator: derives the view, wires everything
      ├─ Toolbar             search, view toggle, filters, columns, export, add, theme, density, bulk actions
      ├─ SummaryBar          aggregate stats over the current view
      ├─ TableHead           select-all + sortable headers + filter row
      ├─ TableRow (×N)       memoised, virtualised, inline-editable rows
      └─ Pagination          shown only in paginated mode
```

### State management — Context + `useReducer`

All **data** state lives in one typed reducer (`src/state/tableReducer.ts`): the committed `rows`, open edit `drafts`, per-row undo `history`, the `modifiedIds` / `selectedIds` sets, `search`, `filters`, `sortRules`, view mode and pagination. This is the Redux pattern without the dependency — pure transitions, a single source of truth, and trivial unit-testability. **UI-only** preferences (theme, density, hidden columns) deliberately live *outside* the data reducer in `useUiPrefs`, persisted to `localStorage`, because they don't change the data.

### The editing model (and why it's fast)

The key decision is that **open edits are kept separate from committed data.** When you open an editor, an entry is added to a `drafts` map keyed by row id; keystrokes only mutate that map. The expensive part — searching, filtering and sorting 10,000 rows — is a `useMemo` in `useDerivedRows` keyed on `rows / search / filters / sortRules`, **not** on `drafts`. So typing in a cell never re-runs the pipeline; only pressing **Save** writes into `rows` and triggers a re-derive. **Undo** is a per-row stack: each Save pushes the previous committed row, and Undo pops it back.

### The data pipeline

```
rows ─► global search ─► per-column filters ─► multi-column sort ─► derived view
```

`derived` is what the table renders, what the summary bar aggregates, and what exports read (intersected with the current selection when "selected only" is chosen).

### Virtualization (`react-window`)

The virtual mode renders rows through `react-window`'s `FixedSizeList`. The list needs an explicit pixel height, so `useElementSize` measures the flex-filling `.table-region` with a `ResizeObserver` and passes that height (and width) to the list — which is what makes the table fill the viewport and keeps the list as the only scroller. `FixedSizeList` hands each visible row a `{ index, style }`; `DataTable.renderRow` applies that `style` (absolute position + height) to the row root, choosing `TableRow` (desktop grid) or `MobileCard` (mobile) based on the breakpoint. A fixed `itemSize` is required — that's why row height is constant per mode (density swaps the desktop value; mobile uses a taller card slot). Pagination reuses the exact same `renderRow`, just over one page's slice in a plain scroll container.

### Rendering & layout

Columns are **config-driven** (`src/data/columns.ts`): one `ColumnDef` array determines rendering, editing, sorting, filtering and exporting — add an entry and the column appears everywhere. Header, filter and body rows share a single CSS-grid `gridTemplateColumns` string so columns stay aligned, including the leading checkbox column and trailing actions column. The data columns use `minmax(min, weight·fr)` tracks, so on desktop they **expand to fill the viewport** (no horizontal scroll) while still keeping a readable minimum when space is tight. Rows are wrapped in `React.memo` so unchanged rows in the virtual window don't re-render on unrelated state changes.

### Responsive strategy

A `useMediaQuery("(max-width: 880px)")` hook picks the layout. Above the breakpoint, `DataTable` renders the fluid grid (`TableRow` + `TableHead`). Below it, the same virtualized list renders `MobileCard`s instead — each record as a stacked card — with a `MobileControls` bar (sort-by select + select-all) standing in for the column header. Because the swap happens at the render layer, **all state, editing, selection, search, sort and virtualization are shared** between the two layouts; only the per-row presentation and the row height differ.

### Theming

Two token sets are defined as CSS variables under `:root` / `[data-theme="dark"]`. `useUiPrefs` flips `document.documentElement[data-theme]`, so a single attribute change re-themes the whole app with no component re-render logic.

### Project structure

```
src/
  data/
    columns.ts          # column config — the single source that drives the table
    generateData.ts     # seeded 10k-row generator (deterministic)
  state/
    tableReducer.ts     # pure reducer: edit, undo, add/delete, select, sort, filter, search, paginate
    TableContext.tsx    # provider + useTable() hook
  hooks/
    useDerivedRows.ts   # memoized search → filter → sort pipeline
    useElementSize.ts   # ResizeObserver — measures the region for react-window
    useMediaQuery.ts    # desktop-grid vs mobile-card breakpoint
    useUiPrefs.ts       # theme / density / column visibility (localStorage)
    useUnsavedPrompt.ts # beforeunload guard
    useClickOutside.ts  # dropdown dismissal
  utils/
    sortFilter.ts       # search, multi-sort, numeric/text filter logic
    export.ts           # CSV / JSON / Excel / clipboard / print
    format.ts           # display formatting (currency, numbers)
  components/
    DataTable.tsx       # orchestrator (react-window list + responsive switch)
    Toolbar.tsx  TableHead.tsx  TableRow.tsx  Pagination.tsx
    MobileCard.tsx  MobileControls.tsx   # mobile (≤880px) layout
    SummaryBar.tsx  ExportMenu.tsx  ColumnMenu.tsx  Icons.tsx
  App.tsx  main.tsx  index.css  types.ts
```

---

## Known limitations

- **Fixed row height** per mode — `react-window`'s `FixedSizeList` requires a constant `itemSize`. Variable-height rows would need `VariableSizeList` (also in `react-window`) with measured offsets.
- **In-memory only** — "Save" commits to in-memory state; there's no backend, so edits, undo history, selection and the unsaved-guard are session-scoped (a hard reload resets the data, though theme/density/column prefs persist).
- **Excel export** uses the HTML-table-as-`.xls` trick (opens cleanly in Excel/Numbers/LibreOffice). A true `.xlsx` with styles/formulas would require a library such as SheetJS.
- **Filtering is substring/operator based**, not fuzzy; sorting is locale-aware with numeric handling but has no per-column custom collation.
- **Mobile card height is fixed** (so virtualization stays exact); it's sized to fit the edit state, which leaves a little extra whitespace in the read state.
- **Per-column filter row is desktop-only** — on mobile, filtering is via global search and the sort bar (per-column filters are hidden to save space).

---

## Evaluation notes

- **Code quality** — small single-responsibility modules, config-driven columns, a pure reducer, and full typing under `strict`. Heavily commented throughout.
- **Performance** — drafts isolated from committed data, memoized derivation, windowed rendering, `React.memo` rows.
- **State & form management** — one centralized reducer with per-row drafts and independent undo stacks.
- **UI/UX** — original custom design with light/dark themes, density, dropdown menus, selection, stats, toasts, and full keyboard/ARIA support.
# Cloudeagle-Assignment
