import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type { Employee } from "../types";
import {
  createInitialState,
  tableReducer,
  type TableAction,
  type TableState,
} from "./tableReducer";

interface TableContextValue {
  state: TableState;
  dispatch: React.Dispatch<TableAction>;
}

const TableContext = createContext<TableContextValue | null>(null);

export function TableProvider({
  initialRows,
  children,
}: {
  initialRows: Employee[];
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(
    tableReducer,
    initialRows,
    createInitialState
  );

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <TableContext.Provider value={value}>{children}</TableContext.Provider>;
}

/** Access the table state + dispatch. Throws if used outside the provider. */
export function useTable(): TableContextValue {
  const ctx = useContext(TableContext);
  if (!ctx) throw new Error("useTable must be used within a <TableProvider>");
  return ctx;
}
