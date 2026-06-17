import { useTable } from "../state/TableContext";

interface Props {
  total: number;
}

const PAGE_SIZES = [25, 50, 100, 200];

export function Pagination({ total }: Props) {
  const { state, dispatch } = useTable();
  const { page, pageSize } = state;

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pageCount - 1);
  const from = total === 0 ? 0 : current * pageSize + 1;
  const to = Math.min(total, (current + 1) * pageSize);

  const go = (p: number) => dispatch({ type: "SET_PAGE", page: Math.max(0, Math.min(pageCount - 1, p)) });

  return (
    <div className="pagination">
      <div className="toolbar-group">
        <span className="muted">Rows per page</span>
        <select
          className="page-size"
          value={pageSize}
          aria-label="Rows per page"
          onChange={(e) => dispatch({ type: "SET_PAGE_SIZE", pageSize: Number(e.target.value) })}
        >
          {PAGE_SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="toolbar-group">
        <span className="muted">
          {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()}
        </span>
        <button className="btn btn-ghost btn-sm" disabled={current === 0} onClick={() => go(0)}>
          « First
        </button>
        <button className="btn btn-ghost btn-sm" disabled={current === 0} onClick={() => go(current - 1)}>
          ‹ Prev
        </button>
        <span className="muted page-indicator">
          Page {current + 1} / {pageCount}
        </span>
        <button
          className="btn btn-ghost btn-sm"
          disabled={current >= pageCount - 1}
          onClick={() => go(current + 1)}
        >
          Next ›
        </button>
        <button
          className="btn btn-ghost btn-sm"
          disabled={current >= pageCount - 1}
          onClick={() => go(pageCount - 1)}
        >
          Last »
        </button>
      </div>
    </div>
  );
}
