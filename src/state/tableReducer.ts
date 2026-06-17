import type {
  Employee,
  EditableField,
  Filters,
  SortRule,
  ViewMode,
} from "../types";

/**
 * Canonical table state.
 *
 *  - `rows`        committed, source-of-truth data.
 *  - `original`    a lookup of the as-generated value for every row, used to
 *                  flag which rows have been modified.
 *  - `drafts`      rows currently in edit mode. The presence of an id means the
 *                  row's editor is open; the value holds the unsaved field changes.
 *  - `history`     per-row undo stack of previous committed states.
 *  - `modifiedIds` rows whose committed value differs from the original.
 */
export interface TableState {
  rows: Employee[];
  original: Record<number, Employee>;
  drafts: Record<number, Partial<Employee>>;
  history: Record<number, Employee[]>;
  modifiedIds: Set<number>;
  sortRules: SortRule[];
  filters: Filters;
  viewMode: ViewMode;
  page: number;
  pageSize: number;
}

export type TableAction =
  | { type: "START_EDIT"; id: number }
  | { type: "CHANGE_DRAFT"; id: number; field: EditableField; value: string | number }
  | { type: "SAVE_ROW"; id: number }
  | { type: "CANCEL_EDIT"; id: number }
  | { type: "UNDO_ROW"; id: number }
  | { type: "TOGGLE_SORT"; key: keyof Employee; additive: boolean }
  | { type: "SET_FILTER"; key: keyof Employee; value: string }
  | { type: "CLEAR_FILTERS" }
  | { type: "SET_VIEW_MODE"; mode: ViewMode }
  | { type: "SET_PAGE"; page: number }
  | { type: "SET_PAGE_SIZE"; pageSize: number };

export function createInitialState(rows: Employee[]): TableState {
  const original: Record<number, Employee> = {};
  for (const r of rows) original[r.id] = r;
  return {
    rows,
    original,
    drafts: {},
    history: {},
    modifiedIds: new Set(),
    sortRules: [],
    filters: {},
    viewMode: "virtual",
    page: 0,
    pageSize: 50,
  };
}

function rowDiffersFromOriginal(row: Employee, original: Employee): boolean {
  return (Object.keys(row) as (keyof Employee)[]).some((k) => row[k] !== original[k]);
}

export function tableReducer(state: TableState, action: TableAction): TableState {
  switch (action.type) {
    case "START_EDIT": {
      if (state.drafts[action.id]) return state;
      return { ...state, drafts: { ...state.drafts, [action.id]: {} } };
    }

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

    case "CANCEL_EDIT": {
      const drafts = { ...state.drafts };
      delete drafts[action.id];
      return { ...state, drafts };
    }

    case "SAVE_ROW": {
      const draft = state.drafts[action.id];
      if (!draft) return state;

      const idx = state.rows.findIndex((r) => r.id === action.id);
      if (idx === -1) return state;

      const prev = state.rows[idx];
      const next: Employee = { ...prev, ...draft };

      // No effective change → just close the editor.
      const changed = (Object.keys(draft) as (keyof Employee)[]).some(
        (k) => draft[k] !== prev[k]
      );
      const drafts = { ...state.drafts };
      delete drafts[action.id];
      if (!changed) return { ...state, drafts };

      const rows = state.rows.slice();
      rows[idx] = next;

      // Push previous committed state onto this row's undo stack.
      const stack = state.history[action.id] ?? [];
      const history = { ...state.history, [action.id]: [...stack, prev] };

      const modifiedIds = new Set(state.modifiedIds);
      if (rowDiffersFromOriginal(next, state.original[action.id])) {
        modifiedIds.add(action.id);
      } else {
        modifiedIds.delete(action.id);
      }

      return { ...state, rows, drafts, history, modifiedIds };
    }

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
      if (rowDiffersFromOriginal(restored, state.original[action.id])) {
        modifiedIds.add(action.id);
      } else {
        modifiedIds.delete(action.id);
      }

      return { ...state, rows, history, modifiedIds };
    }

    case "TOGGLE_SORT": {
      const existing = state.sortRules.find((r) => r.key === action.key);
      let sortRules: SortRule[];

      if (action.additive) {
        // Shift-click: build/extend a multi-column sort.
        if (!existing) {
          sortRules = [...state.sortRules, { key: action.key, direction: "asc" }];
        } else if (existing.direction === "asc") {
          sortRules = state.sortRules.map((r) =>
            r.key === action.key ? { ...r, direction: "desc" } : r
          );
        } else {
          // asc -> desc -> remove
          sortRules = state.sortRules.filter((r) => r.key !== action.key);
        }
      } else {
        // Plain click: single-column sort cycling asc -> desc -> none.
        if (!existing) sortRules = [{ key: action.key, direction: "asc" }];
        else if (existing.direction === "asc")
          sortRules = [{ key: action.key, direction: "desc" }];
        else sortRules = [];
      }

      return { ...state, sortRules, page: 0 };
    }

    case "SET_FILTER": {
      return {
        ...state,
        filters: { ...state.filters, [action.key]: action.value },
        page: 0,
      };
    }

    case "CLEAR_FILTERS":
      return { ...state, filters: {}, page: 0 };

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
