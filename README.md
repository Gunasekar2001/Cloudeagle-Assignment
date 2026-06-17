# Advanced Editable Data Table

A data-intensive, inline-editable React table built for **10,000+ rows**. It supports inline editing with per-row save / cancel / undo, custom virtual scrolling (with a pagination fallback), multi-column sorting, per-column filtering, and CSV export — all with zero runtime UI dependencies.

Built with **React 18 + TypeScript + Vite**, custom CSS, and a Context + reducer state layer.

![stack](https://img.shields.io/badge/React-18-blue) ![ts](https://img.shields.io/badge/TypeScript-strict-3178c6) ![deps](https://img.shields.io/badge/runtime%20deps-react%20only-success)

---

## Setup

Requires Node 18+.

```bash
npm install
npm run dev        # start the dev server (http://localhost:5173)
```

Other scripts:

```bash
npm run build      # type-check (tsc) + production build to dist/
npm run preview    # serve the production build
npm run typecheck  # type-check only
```

---

## Features

**Inline editing.** Double-click any row (or press **Edit**) to open an inline editor. Text, numeric, and select (dropdown) fields are all editable. Inside an open editor:

- **Save** commits the change (or press <kbd>Enter</kbd>).
- **Cancel** discards the draft (or press <kbd>Esc</kbd>).
- **Undo** reverts the most recent *saved* change for that row, with a full per-row undo history stack.

Numeric inputs are validated — non-numeric entry is rejected rather than corrupting the data. Modified rows are highlighted and counted, and the salary column is formatted as currency.

**Large-dataset performance.** The dataset is 10,000 rows by default (deterministically generated so it's stable across reloads). Two strategies are provided and toggleable at runtime:

- **Virtual scroll** (default) — a custom, dependency-free windowing hook renders only the rows intersecting the viewport plus a small overscan. The DOM stays at a few dozen nodes regardless of dataset size, so it scrolls smoothly at 10k, 100k, or more.
- **Paginated** — a fallback mode with selectable page sizes (25 / 50 / 100 / 200) and first/prev/next/last controls.

**Sorting.** Click a column header to cycle ascending → descending → none. **Shift-click** headers to build a multi-column sort; the sort precedence is shown as a numbered badge on each sorted column.

**Filtering.** A per-column filter row matches text columns by case-insensitive substring. Numeric columns additionally accept operator expressions — `>100`, `>=100`, `<50`, `=42`, or an inclusive range like `10-20`. A **Clear filters** button resets them all.

**Bonus features.**

- **CSV export** of the current (filtered + sorted) view, RFC-4180 escaped.
- **Unsaved-changes guard** — a `beforeunload` prompt fires if you try to close or reload the tab while a row editor is still open.
- **Context + reducer state management** — all table state lives in a single typed reducer (a lightweight Redux-style pattern without the dependency).

Keyboard & a11y: ARIA `table`/`row`/`cell`/`columnheader` roles, `aria-label`s on inputs, full keyboard support in the editor, and visible focus styles.

---

## Approach & decisions

**State management — Context + `useReducer`.** All table state (rows, open drafts, per-row undo history, modified-row set, sort rules, filters, view mode, pagination) is centralized in one typed reducer (`src/state/tableReducer.ts`) exposed via context. This gives Redux-style predictability and a single source of truth without adding a dependency. The reducer is pure and each action returns new references only for the slices that changed, which keeps re-renders cheap.

**Editing model — drafts kept separate from committed data.** Open edits live in a `drafts` map keyed by row id, separate from the canonical `rows` array. This matters for performance: typing in an editor only mutates `drafts`, so the expensive filter+sort derivation (memoized on `rows`/`filters`/`sortRules`) does **not** re-run on every keystroke — only on save. Undo is implemented as a per-row stack of previous committed states, so each row can be reverted independently.

**Virtualization — custom hook instead of a library.** The task suggested `react-window` / `react-virtualized`. I implemented a small custom virtualizer (`src/hooks/useVirtualizer.ts`) instead because the table needs a real grid layout with editable inputs, and a hand-rolled windowing layer keeps full control over row layout, keeps the bundle dependency-free, and makes the performance approach explicit and reviewable. It's ~40 lines: compute the visible index window from `scrollTop` + row height, render that slice absolutely positioned inside a full-height spacer. (See *Known limitations* for the trade-off vs. a library.)

**Layout — CSS grid, fixed row height.** Each row is a CSS-grid row sharing one column template with the header and filter rows, so columns stay aligned. A fixed row height (44px) is what makes windowing math exact. The header and filter rows are sticky.

**Styling — custom CSS, no UI library.** Hand-written CSS with design tokens (CSS variables) for a clean, accessible look and a minimal bundle (~51 kB gzipped JS total). Status values render as colored badges; modified/editing rows are visually distinguished.

**Determinism.** The mock data uses a seeded PRNG (mulberry32) so the 10k rows — and therefore any screenshots or manual tests — are identical on every load.

### Project structure

```
src/
  data/
    columns.ts         # column config (drives rendering, editing, sorting)
    generateData.ts    # seeded 10k-row generator
  state/
    tableReducer.ts    # pure reducer: edits, undo, sort, filter, pagination
    TableContext.tsx   # provider + useTable() hook
  hooks/
    useDerivedRows.ts  # memoized filter + sort pipeline
    useVirtualizer.ts  # custom windowing
    useUnsavedPrompt.ts# beforeunload guard
  utils/
    sortFilter.ts      # multi-sort + numeric/text filter logic
    csv.ts             # RFC-4180 CSV serialize + download
    format.ts          # display formatting (currency, numbers)
  components/
    DataTable.tsx      # orchestrates head + body + pagination
    TableHead.tsx      # sortable headers + filter row
    TableRow.tsx       # memoized editable row
    Toolbar.tsx        # view toggle, filters, CSV, status pills
    Pagination.tsx     # pagination controls
  App.tsx
```

---

## Known limitations

- **Fixed row height.** The windowing math assumes a constant row height (44px). Variable-height rows would need measured offsets.
- **Custom virtualizer scope.** The hand-rolled virtualizer covers vertical windowing well, but a mature library (`react-window`/TanStack Virtual) adds extras like dynamic measurement, horizontal virtualization, and scroll-to-index. Swapping it in would be localized to `useVirtualizer.ts` + `DataTable.tsx`.
- **In-memory only.** "Save" commits to in-memory state; there is no backend persistence, so changes are lost on a hard reload. The undo history and unsaved-changes guard are also session-scoped.
- **Filtering is substring/operator based**, not fuzzy; sorting uses locale-aware comparison with numeric awareness but no custom collation per column.
- **Horizontal scrollbar placement.** When the viewport is narrower than the table, the body's vertical scrollbar sits at the right edge of the (wider) content; vertical mouse-wheel scrolling still works everywhere.

---

## Evaluation notes

- **Code quality** — small, single-responsibility modules; config-driven columns; pure reducer; typed throughout under `strict`.
- **Performance** — drafts isolated from committed data, memoized derivation, windowed rendering, `React.memo` rows.
- **State & form management** — centralized reducer with per-row drafts and undo stacks.
- **UI/UX** — clean custom design, keyboard support, ARIA roles, status badges, modified/unsaved indicators.
