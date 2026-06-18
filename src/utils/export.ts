import type { Employee, ColumnDef, ExportFormat } from "../types";
import { formatCell } from "./format";

/**
 * ============================================================================
 *  EXPORT UTILITIES
 * ============================================================================
 * One small, dependency-free module that turns the current rows into any of
 * five output formats. Each format is a pure string/serialise function; the
 * `exportRows` dispatcher at the bottom wires them to a download / clipboard /
 * print side-effect.
 */

/** RFC-4180 CSV escaping: wrap in quotes if the value has a comma, quote or newline. */
function escapeCsv(value: unknown): string {
  const s = String(value ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Escape the five XML/HTML entities so cell text can't break the Excel/print markup. */
function escapeXml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Comma-separated values (raw numeric values, not display-formatted). */
export function toCsv(rows: Employee[], columns: ColumnDef[]): string {
  const header = columns.map((c) => escapeCsv(c.label)).join(",");
  const body = rows.map((r) => columns.map((c) => escapeCsv(r[c.key])).join(",")).join("\n");
  return `${header}\n${body}`;
}

/** Tab-separated values — ideal for pasting straight into Excel / Google Sheets. */
export function toTsv(rows: Employee[], columns: ColumnDef[]): string {
  const header = columns.map((c) => c.label).join("\t");
  const body = rows.map((r) => columns.map((c) => String(r[c.key])).join("\t")).join("\n");
  return `${header}\n${body}`;
}

/** Pretty-printed JSON containing only the visible columns. */
export function toJson(rows: Employee[], columns: ColumnDef[]): string {
  const keys = columns.map((c) => c.key);
  const slim = rows.map((r) => {
    const o: Record<string, unknown> = {};
    for (const k of keys) o[k] = r[k];
    return o;
  });
  return JSON.stringify(slim, null, 2);
}

/**
 * A minimal HTML table saved with a `.xls` extension + the ms-excel mime type.
 * Excel, Numbers and LibreOffice all open this as a real spreadsheet — giving
 * us "Excel export" with zero extra dependencies.
 */
export function toExcelHtml(rows: Employee[], columns: ColumnDef[]): string {
  const head = columns.map((c) => `<th>${escapeXml(c.label)}</th>`).join("");
  const body = rows
    .map(
      (r) =>
        `<tr>${columns
          .map((c) => `<td>${escapeXml(formatCell(c, r[c.key]))}</td>`)
          .join("")}</tr>`
    )
    .join("");
  return `<html><head><meta charset="utf-8"></head><body>
    <table border="1"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
  </body></html>`;
}

/** Trigger a browser download of an arbitrary text blob. */
function download(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Open a print-friendly window containing a clean table and invoke the OS print dialog. */
function printRows(rows: Employee[], columns: ColumnDef[]): void {
  const win = window.open("", "_blank", "width=900,height=650");
  if (!win) return;
  const head = columns.map((c) => `<th>${escapeXml(c.label)}</th>`).join("");
  const body = rows
    .map(
      (r) =>
        `<tr>${columns.map((c) => `<td>${escapeXml(formatCell(c, r[c.key]))}</td>`).join("")}</tr>`
    )
    .join("");
  win.document.write(`<!doctype html><html><head><title>Employees</title>
    <style>
      body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;padding:24px;color:#1c2536}
      h1{font-size:18px} table{border-collapse:collapse;width:100%;font-size:12px}
      th,td{border:1px solid #d4dae6;padding:6px 8px;text-align:left}
      th{background:#f1f4fa;text-transform:uppercase;font-size:11px;letter-spacing:.04em}
      tr:nth-child(even) td{background:#fafbfe}
    </style></head><body>
    <h1>Employees — ${rows.length} rows</h1>
    <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
    <script>window.onload=function(){window.print()}<\/script>
  </body></html>`);
  win.document.close();
}

/**
 * Dispatcher used by the UI. Returns a short human-readable result message
 * (e.g. for a toast) and performs the relevant side effect.
 */
export async function exportRows(
  format: ExportFormat,
  rows: Employee[],
  columns: ColumnDef[]
): Promise<string> {
  switch (format) {
    case "csv":
      download("employees.csv", toCsv(rows, columns), "text/csv;charset=utf-8;");
      return `Exported ${rows.length} rows to CSV`;
    case "json":
      download("employees.json", toJson(rows, columns), "application/json");
      return `Exported ${rows.length} rows to JSON`;
    case "excel":
      download("employees.xls", toExcelHtml(rows, columns), "application/vnd.ms-excel");
      return `Exported ${rows.length} rows to Excel`;
    case "clipboard":
      await navigator.clipboard.writeText(toTsv(rows, columns));
      return `Copied ${rows.length} rows to clipboard`;
    case "print":
      printRows(rows, columns);
      return "Opening print view…";
  }
}
