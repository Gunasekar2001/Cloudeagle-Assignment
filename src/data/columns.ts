import type { ColumnDef } from "../types";

export const STATUS_OPTIONS = ["Active", "On Leave", "Terminated"] as const;

export const DEPARTMENT_OPTIONS = [
  "Engineering",
  "Sales",
  "Marketing",
  "Finance",
  "HR",
  "Support",
  "Design",
  "Operations",
] as const;

/**
 * Column configuration drives rendering, editing and sorting.
 * Adding a column here is enough to surface it in the table.
 */
export const COLUMNS: ColumnDef[] = [
  { key: "id", label: "ID", type: "number", editable: false, width: 80, align: "right" },
  { key: "name", label: "Name", type: "text", editable: true, width: 180 },
  { key: "email", label: "Email", type: "text", editable: true, width: 240 },
  {
    key: "department",
    label: "Department",
    type: "select",
    editable: true,
    width: 150,
    options: DEPARTMENT_OPTIONS,
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    editable: true,
    width: 130,
    options: STATUS_OPTIONS,
  },
  { key: "salary", label: "Salary", type: "number", editable: true, width: 130, align: "right" },
  { key: "quantity", label: "Quantity", type: "number", editable: true, width: 110, align: "right" },
  {
    key: "performance",
    label: "Performance",
    type: "number",
    editable: true,
    width: 130,
    align: "right",
  },
];
