/**
 * Shared domain + table types.
 *
 * Keeping every shared shape in one file means the data model, the reducer,
 * the UI components and the export utilities all agree on the same contracts —
 * change a type here and TypeScript flags every place that needs updating.
 */

/** The lifecycle state of an employee record. Drives the colored status badge. */
export type EmployeeStatus = "Active" | "On Leave" | "Terminated";

/** One row of the table — the core domain entity. */
export interface Employee {
  id: number;
  name: string;
  email: string;
  department: string;
  status: EmployeeStatus;
  salary: number;
  quantity: number;
  performance: number; // 0 - 100 score
}

/** Editable fields only (`id` is the immutable primary key and is never edited). */
export type EditableField = Exclude<keyof Employee, "id">;

/** How a column is rendered + edited. */
export type ColumnType = "text" | "number" | "select";

/**
 * Declarative column definition. The whole table (rendering, editing, sorting,
 * filtering, exporting) is driven from an array of these — add one entry and a
 * new column appears everywhere, no component edits required.
 */
export interface ColumnDef {
  key: keyof Employee;
  label: string;
  type: ColumnType;
  editable: boolean;
  width: number;
  /** Options for a `select` column. */
  options?: readonly string[];
  /** Horizontal alignment of the cell content. */
  align?: "left" | "right" | "center";
}

export type SortDirection = "asc" | "desc";

/** A single sort instruction. The reducer keeps an ordered list of these for multi-sort. */
export interface SortRule {
  key: keyof Employee;
  direction: SortDirection;
}

/**
 * Per-column filter text. A numeric column accepts operator expressions such as
 * `>100`, `<=50`, `=42` or a range `10-20`; text columns do substring matching.
 */
export type Filters = Partial<Record<keyof Employee, string>>;

/** Large-dataset rendering strategy. */
export type ViewMode = "virtual" | "paginated";

/** Supported export formats surfaced in the export menu. */
export type ExportFormat = "csv" | "json" | "excel" | "clipboard" | "print";

/** Whether an export covers every (filtered) row or only the checkbox-selected rows. */
export type ExportScope = "view" | "selected";

/** Row height presets, toggled from the toolbar. */
export type Density = "comfortable" | "compact";

/** Light / dark color scheme. */
export type Theme = "light" | "dark";
