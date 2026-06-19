import { memo } from "react";
import type { Employee, EditableField, ColumnDef } from "../types";
import { formatCell } from "../utils/format";
import { useTable } from "../state/TableContext";
import { CheckIcon, XIcon, EditIcon, UndoIcon, TrashIcon } from "./Icons";

interface Props {
  row: Employee;
  draft?: Partial<Employee>;
  isModified: boolean;
  isSelected: boolean;
  canUndo: boolean;
  columns: ColumnDef[];
}

/**
 * Mobile/stacked rendering of a single record. On narrow screens a wide grid
 * row is unusable, so each record becomes a self-contained card: an identity
 * header, a 2-column label/value grid, and the same edit/undo/delete actions.
 * Used in place of <TableRow> below the responsive breakpoint.
 */
function MobileCardInner({
  row,
  draft,
  isModified,
  isSelected,
  canUndo,
  columns,
}: Props) {
  const { dispatch } = useTable();
  const isEditing = draft !== undefined;

  const valueOf = (key: keyof Employee) =>
    isEditing && key in (draft as object) ? (draft as Partial<Employee>)[key] : row[key];

  const onChange = (field: EditableField, raw: string, isNumber: boolean) => {
    const next: string | number = isNumber ? (raw === "" ? 0 : Number(raw)) : raw;
    if (isNumber && Number.isNaN(next as number)) return;
    dispatch({ type: "CHANGE_DRAFT", id: row.id, field, value: next });
  };

  // Columns shown in the body grid (identity columns are surfaced in the header).
  const bodyCols = columns.filter((c) => c.key !== "name" && c.key !== "status");

  const cardClass =
    "mcard" +
    (isEditing ? " editing" : "") +
    (isModified ? " modified" : "") +
    (isSelected ? " selected" : "");

  return (
    // The parent slot (from react-window) is the positioned/sized element;
    // the card fills it with a small margin to create the gap between cards.
    <div className={cardClass}>
      <div className="mcard-head">
        <input
          type="checkbox"
          aria-label={`Select row ${row.id}`}
          checked={isSelected}
          onChange={() => dispatch({ type: "TOGGLE_SELECT", id: row.id })}
        />
        <div className="mcard-identity">
          {isEditing ? (
            <input
              className="cell-input"
              value={String(valueOf("name"))}
              aria-label="Name"
              placeholder="Name"
              onChange={(e) => onChange("name", e.target.value, false)}
            />
          ) : (
            <span className="mcard-name">{String(valueOf("name")) || "—"}</span>
          )}
          <span className="mcard-id">#{row.id}</span>
        </div>
        {!isEditing && (
          <span
            className={`badge badge-${String(valueOf("status"))
              .replace(/\s+/g, "-")
              .toLowerCase()}`}
          >
            {String(valueOf("status"))}
          </span>
        )}
      </div>

      <div className="mcard-grid">
        {bodyCols.map((col) => {
          const v = valueOf(col.key);
          return (
            <div className="mcard-field" key={col.key}>
              <span className="mcard-label">{col.label}</span>
              {isEditing && col.editable ? (
                col.type === "select" ? (
                  <select
                    className="cell-input"
                    value={String(v)}
                    aria-label={col.label}
                    onChange={(e) => onChange(col.key as EditableField, e.target.value, false)}
                  >
                    {col.options?.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="cell-input"
                    type={col.type === "number" ? "number" : "text"}
                    value={String(v)}
                    aria-label={col.label}
                    onChange={(e) =>
                      onChange(col.key as EditableField, e.target.value, col.type === "number")
                    }
                  />
                )
              ) : (
                <span className="mcard-value">
                  {formatCell(col, v as Employee[keyof Employee])}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mcard-actions">
        {isEditing ? (
          <>
            <button className="btn btn-sm btn-primary" onClick={() => dispatch({ type: "SAVE_ROW", id: row.id })}>
              <CheckIcon width={14} height={14} /> Save
            </button>
            <button className="btn btn-sm" onClick={() => dispatch({ type: "CANCEL_EDIT", id: row.id })}>
              <XIcon width={14} height={14} /> Cancel
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-sm" onClick={() => dispatch({ type: "START_EDIT", id: row.id })}>
              <EditIcon width={14} height={14} /> Edit
            </button>
            <button
              className="btn btn-sm"
              disabled={!canUndo}
              onClick={() => dispatch({ type: "UNDO_ROW", id: row.id })}
            >
              <UndoIcon width={14} height={14} /> Undo
            </button>
            <button
              className="btn btn-sm btn-danger"
              onClick={() => dispatch({ type: "DELETE_ROWS", ids: [row.id] })}
            >
              <TrashIcon width={14} height={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export const MobileCard = memo(MobileCardInner);
