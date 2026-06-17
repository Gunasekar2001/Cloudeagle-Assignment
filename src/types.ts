/**
 * Shared domain + table types.
 */

export type EmployeeStatus = "Active" | "On Leave" | "Terminated";

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

/** Editable fields only (id is the immutable primary key). */
export type EditableField = Exclude<keyof Employee, "id">;

export type ColumnType = "text" | "number" | "select";

export interface ColumnDef {
  key: keyof Employee;
  label: string;
  type: ColumnType;
  editable: boolean;
  width: number;
  /** Options for a `select` column. */
  options?: readonly string[];
  /** Alignment of the cell content. */
  align?: "left" | "right" | "center";
}

export type SortDirection = "asc" | "desc";

export interface SortRule {
  key: keyof Employee;
  direction: SortDirection;
}

/** Per-column filter text. A numeric column accepts operators like `>100`, `<=50`, `10-20`. */
export type Filters = Partial<Record<keyof Employee, string>>;

export type ViewMode = "virtual" | "paginated";
