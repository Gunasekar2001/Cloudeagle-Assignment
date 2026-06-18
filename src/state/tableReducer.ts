import type {
  Employee,
  EditableField,
  Filters,
  SortRule,
  ViewMode,
} from "../types";
import { DEPARTMENT_OPTIONS } from "../data/columns";

/**
 * ============================================================================
 *  TABLE STATE  —  the single source of truth
 * ============================================================================
 *
 * Everything that can change about the table lives in this one object and is
 * only ever mutated through the pure `tableReducer` below. This is the
 * "Redux pattern" without the Redux dependency: predictable transitions,
 * easy to test, and trivial to reason about.
 *
 *  - rows        : committed, source-of-truth data (what "save" writes to).
 *  - original    : the as-generated value of every row, so we can tell which
 *                  rows have actually been changed by the user.
 *  - drafts      : rows whose inline editor is currently OPEN. The value holds
 *                  the not-yet-saved field changes. Keeping drafts OUT of `rows`
 *                  is the key performance trick — typing only touches `drafts`,
 *                  so the expensive filter+sort pass over 10k rows does not run
 *                  on every keystroke (only on Save).
 *  - history     : per-row undo stack of previous committed states.
 *  - modifiedIds : rows whose committed value differs from the original.
 *  - selectedIds : checkbox-selected rows (for bulk delete / export-selected).
 *  - search      : global search string, matched across all columns.
 *  - nextId      : auto-increment id for newly added rows.
 */
export interface TableState {
  rows: Employee[];
  original: Record<number, Employee>;
  drafts: Record<number, Partial<Employee>>;
  history: Record<number, Employee[]>;
  modifiedIds: Set<number>;
  selectedIds: Set<number>;
  search: string;
  nextId: number;
  sortRules: SortRule[];
  filters: Filters;
  viewMode: ViewMode;
  page: number;
  pageSize: number;
}

/** Every way the state can change, expressed as a discriminated union. */
export type TableAction =
  // --- inline editing ---
  | { type: "START_EDIT"; id: number }
  | { type: "CHANGE_DRAFT"; id: number; field: EditableField; value: string | number }
  | { type: "SAVE_ROW"; id: number }
  | { type: "CANCEL_EDIT"; id: number }
  | { type: "UNDO_ROW"; id: number }
  // --- add / delete ---
  | { type: "ADD_ROW" }
  | { type: "DELETE_ROWS"; ids: number[] }
  // --- selection ---
  | { type: "TOGGLE_SELECT"; id: number }
  | { type: "SET_SELECTION"; ids: number[] }
  | { type: "CLEAR_SELECTION" }
  // --- sorting / filtering / search ---
  | { type: "TOGGLE_SORT"; key: keyof Employee; additive: boolean }
  | { type: "SET_FILTER"; key: keyof Employee; value: string }
  | { type: "CLEAR_FILTERS" }
  | { type: "SET_SEARCH"; value: string }
  // --- view / pagination ---
  | { type: "SET_VIEW_MODE"; mode: ViewMode }
  | { type: "SET_PAGE"; page: number }
  | { type: "SET_PAGE_SIZE"; pageSize: number };

/** Build the initial state from a freshly generated dataset. */
export function createInitialState(rows: Employee[]): TableState {
  const original: Record<number, Employee> = {};
  let maxId = 0;
  for (const r of rows) {
    original[r.id] = r;
    if (r.id > maxId) maxId = r.id;
  }
  return {
    rows,
    original,
    drafts: {},
    history: {},
    modifiedIds: new Set(),
    selectedIds: new Set(),
    search: "",
    nextId: maxId + 1,
    sortRules: [],
    filters: {},
    viewMode: "virtual",
    page: 0,
    pageSize: 50,
  };
}

/** True when a row no longer matches its original value (or has no original — i.e. it's new). */
function rowDiffersFromOriginal(row: Employee, original: Employee | undefined): boolean {
  if (!original) return true; // newly added rows count as "modified"
  return (Object.keys(row) as (keyof Employee)[]).some((k) => row[k] !== original[k]);
}

/**
 * The reducer: (state, action) -> new state. It is PURE — it never mutates the
 * incoming state, and returns fresh references only for the slices that changed
 * so React can re-render the minimum necessary.
 */
export function tableReducer(state: TableState, action: TableAction): TableState {
  switch (action.type) {
    // ----- Open a row's inline editor (start with an empty draft) -----
    case "START_EDIT": {
      if (state.drafts[action.id]) return state; // already editing
      return { ...state, drafts: { ...state.drafts, [action.id]: {} } };
    }

    // ----- A field changed inside an open editor (cheap: only `drafts` updates) -----
    case "CHANGE_DRAFT": {
      const current = state.drafts[action.id] ?? {};
      return {
        ...state,
        drafts: {
          ...state.drafts,
          [action.id]: { ...current, [action.field]: action.value },
        },
      };
    }

    // ----- Discard the open draft, leaving committed data untouched -----
    case "CANCEL_EDIT": {
      const drafts = { ...state.drafts };
      delete drafts[action.id];
      return { ...state, drafts };
    }

    // ----- Commit the draft into `rows`, pushing the previous value onto undo history -----
    case "SAVE_ROW": {
      const draft = state.drafts[action.id];
      if (!draft) return state;

      const idx = state.rows.findIndex((r) => r.id === action.id);
      if (idx === -1) return state;

      const prev = state.rows[idx];
      const next: Employee = { ...prev, ...draft };

      // Close the editor regardless.
      const drafts = { ...state.drafts };
      delete drafts[action.id];

      // If nothing effectively changed, just close — don't pollute undo history.
      const changed = (Object.keys(draft) as (keyof Employee)[]).some((k) => draft[k] !== prev[k]);
      if (!changed) return { ...state, drafts };

      const rows = state.rows.slice();
      rows[idx] = next;

      // Push the previous committed state onto this row's undo stack.
      const stack = state.history[action.id] ?? [];
      const history = { ...state.history, [action.id]: [...stack, prev] };

      // Recompute the "modified" flag for this row.
      const modifiedIds = new Set(state.modifiedIds);
      if (rowDiffersFromOriginal(next, state.original[action.id])) modifiedIds.add(action.id);
      else modifiedIds.delete(action.id);

      return { ...state, rows, drafts, history, modifiedIds };
    }

    // ----- Revert the most recent saved change for a row -----
    case "UNDO_ROW": {
      const stack = state.history[action.id];
      if (!stack || stack.length === 0) return state;

      const idx = state.rows.findIndex((r) => r.id === action.id);
      if (idx === -1) return state;

      const restored = stack[stack.length - 1];
      const newStack = stack.slice(0, -1);
      const history = { ...state.history };
      if (newStack.length === 0) delete history[action.id];
      else history[action.id] = newStack;

      const rows = state.rows.slice();
      rows[idx] = restored;

      const modifiedIds = new Set(state.modifiedIds);
      if (rowDiffersFromOriginal(restored, state.original[action.id])) modifiedIds.add(action.id);
      else modifiedIds.delete(action.id);

      return { ...state, rows, history, modifiedIds };
    }

    // ----- Prepend a blank row and open it for editing -----
    case "ADD_ROW": {
      const id = state.nextId;
      const blank: Employee = {
        id,
        name: "",
        email: "",
        department: DEPARTMENT_OPTIONS[0],
        status: "Active",
        salary: 0,
        quantity: 0,
        performance: 0,
      };
      const modifiedIds = new Set(state.modifiedIds);
      modifiedIds.add(id); // brand-new rows are "modified" until persisted
      return {
        ...state,
        rows: [blank, ...state.rows],
        drafts: { ...state.drafts, [id]: {} }, // open its editor immediately
        modifiedIds,
        nextId: id + 1,
        page: 0,
      };
    }

    // ----- Delete one or many rows and clean up every per-row map -----
    case "DELETE_ROWS": {
      const ids = new Set(action.ids);
      if (ids.size === 0) return state;

      const rows = state.rows.filter((r) => !ids.has(r.id));
      const drafts = { ...state.drafts };
      const history = { ...state.history };
      const modifiedIds = new Set(state.modifiedIds);
      const selectedIds = new Set(state.selectedIds);
      for (const id of ids) {
        delete drafts[id];
        delete history[id];
        modifiedIds.delete(id);
        selectedIds.delete(id);
      }
      return { ...state, rows, drafts, history, modifiedIds, selectedIds };
    }

    // ----- Toggle a single row's checkbox -----
    case "TOGGLE_SELECT": {
      const selectedIds = new Set(state.selectedIds);
      if (selectedIds.has(action.id)) selectedIds.delete(action.id);
      else selectedIds.add(action.id);
      return { ...state, selectedIds };
    }

    // ----- Replace the whole selection (used by the header "select all in view") -----
    case "SET_SELECTION":
      return { ...state, selectedIds: new Set(action.ids) };

    case "CLEAR_SELECTION":
      return { ...state, selectedIds: new Set() };

    // ----- Cycle a column's sort; shift-click builds a multi-column sort -----
    case "TOGGLE_SORT": {
      const existing = state.sortRules.find((r) => r.key === action.key);
      let sortRules: SortRule[];

      if (action.additive) {
        // Shift-click: add / advance / remove this column within a multi-sort.
        if (!existing) sortRules = [...state.sortRules, { key: action.key, direction: "asc" }];
        else if (existing.direction === "asc")
          sortRules = state.sortRules.map((r) =>
            r.key === action.key ? { ...r, direction: "desc" } : r
          );
        else sortRules = state.sortRules.filter((r) => r.key !== action.key); // asc->desc->off
      } else {
        // Plain click: single-column sort cycling asc -> desc -> none.
        if (!existing) sortRules = [{ key: action.key, direction: "asc" }];
        else if (existing.direction === "asc") sortRules = [{ key: action.key, direction: "desc" }];
        else sortRules = [];
      }
      return { ...state, sortRules, page: 0 };
    }

    case "SET_FILTER":
      return { ...state, filters: { ...state.filters, [action.key]: action.value }, page: 0 };

    case "CLEAR_FILTERS":
      return { ...state, filters: {}, search: "", page: 0 };

    case "SET_SEARCH":
      return { ...state, search: action.value, page: 0 };

    case "SET_VIEW_MODE":
      return { ...state, viewMode: action.mode, page: 0 };

    case "SET_PAGE":
      return { ...state, page: action.page };

    case "SET_PAGE_SIZE":
      return { ...state, pageSize: action.pageSize, page: 0 };

    default:
      return state;
  }
}
