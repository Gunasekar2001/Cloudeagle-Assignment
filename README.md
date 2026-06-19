# Advanced Editable Data Table

A data-intensive, inline-editable React table built for **10,000+ rows**. It combines inline editing (with per-row save / cancel / undo), a custom dependency-free virtual scroller (plus a pagination fallback), global search, multi-column sorting, per-column filtering, row selection with bulk actions, add/delete rows, column show/hide, light & dark themes, adjustable density, and **five export formats** — all with **zero runtime UI dependencies** (React only).

Built with **React 18 + TypeScript (strict) + Vite**, custom CSS, and a Context + reducer state layer.

![React](https://img.shields.io/badge/React-18-61dafb) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6) ![deps](https://img.shields.io/badge/runtime%20deps-react%20only-22c55e) ![bundle](https://img.shields.io/badge/JS-~55kB%20gzip-8b5cf6)

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
- **Virtual scroll** (default) — a custom windowing hook renders only the rows intersecting the viewport (plus a small overscan). The DOM stays at a few dozen nodes at any dataset size.
- **Paginated** fallback — selectable page sizes (25 / 50 / 100 / 200) with first/prev/next/last controls.

### Find, sort & filter
- **Global search** across every visible column (case-insensitive substring).
- **Multi-column sort** — click a header to cycle asc → desc → off; **Shift-click** to build a multi-column sort with visible precedence badges.
- **Per-column filters** — substring for text; operator expressions for numbers (`>100`, `>=100`, `<50`, `=42`, range `10-20`).
- **Clear filters** resets search + all column filters at once.

### Export (5 formats)
CSV · JSON · Excel (`.xls`) · **Copy to clipboard** (TSV, paste straight into Sheets/Excel) · **Print / Save as PDF**. Exports respect the current search/filter/sort **and** column visibility, and can be scoped to **selected rows only**.

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

### Virtualization (custom, ~40 lines)

`useVirtualizer` reads the scroll container's `scrollTop` and, from the fixed row height and viewport height, computes the visible index window `[startIndex, endIndex)` plus overscan. The body renders a full-height spacer (`rowCount × rowHeight`) so the native scrollbar is correct, and each rendered row is absolutely positioned at `index × rowHeight`. The fixed row height (which changes with density) is what makes this math exact. Pagination reuses the same row component — it just renders one page's slice instead of a scroll window. A library like `react-window` or TanStack Virtual could drop into `useVirtualizer.ts` + `DataTable.tsx` if dynamic row heights or scroll-to-index were needed.

### Rendering & layout

Columns are **config-driven** (`src/data/columns.ts`): one `ColumnDef` array determines rendering, editing, sorting, filtering and exporting — add an entry and the column appears everywhere. Header, filter and body rows share a single CSS-grid `gridTemplateColumns` string so columns stay aligned, including the leading checkbox column and trailing actions column. Rows are wrapped in `React.memo` so unchanged rows in the virtual window don't re-render on unrelated state changes.

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
    useVirtualizer.ts   # custom row windowing
    useUiPrefs.ts       # theme / density / column visibility (localStorage)
    useUnsavedPrompt.ts # beforeunload guard
    useClickOutside.ts  # dropdown dismissal
  utils/
    sortFilter.ts       # search, multi-sort, numeric/text filter logic
    export.ts           # CSV / JSON / Excel / clipboard / print
    format.ts           # display formatting (currency, numbers)
  components/
    DataTable.tsx       # orchestrator
    Toolbar.tsx  TableHead.tsx  TableRow.tsx  Pagination.tsx
    SummaryBar.tsx  ExportMenu.tsx  ColumnMenu.tsx  Icons.tsx
  App.tsx  main.tsx  index.css  types.ts
```

---

## Known limitations

- **Fixed row height** per density — the windowing math assumes a constant row height. Variable-height rows would need measured offsets (or a virtualization library).
- **In-memory only** — "Save" commits to in-memory state; there's no backend, so edits, undo history, selection and the unsaved-guard are session-scoped (a hard reload resets the data, though theme/density/column prefs persist).
- **Custom virtualizer scope** — vertical windowing only; no dynamic measurement, horizontal virtualization, or scroll-to-index.
- **Excel export** uses the HTML-table-as-`.xls` trick (opens cleanly in Excel/Numbers/LibreOffice). A true `.xlsx` with styles/formulas would require a library such as SheetJS.
- **Filtering is substring/operator based**, not fuzzy; sorting is locale-aware with numeric handling but has no per-column custom collation.
- **Horizontal scrollbar placement** — when the viewport is narrower than the table, the body's vertical scrollbar sits at the right edge of the wider content; mouse-wheel vertical scrolling still works everywhere.

---

## Evaluation notes

- **Code quality** — small single-responsibility modules, config-driven columns, a pure reducer, and full typing under `strict`. Heavily commented throughout.
- **Performance** — drafts isolated from committed data, memoized derivation, windowed rendering, `React.memo` rows.
- **State & form management** — one centralized reducer with per-row drafts and independent undo stacks.
- **UI/UX** — original custom design with light/dark themes, density, dropdown menus, selection, stats, toasts, and full keyboard/ARIA support.
# Cloudeagle-Assignment
