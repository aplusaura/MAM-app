"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useCallback, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Download, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Column<T> {
  key: string;
  label: string;
  /** When true the column header becomes clickable for client-side sorting */
  sortable?: boolean;
  render?: (row: T, index?: number) => React.ReactNode;
}

type SortDir = "asc" | "desc";

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  keyField?: keyof T;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  renderHoverCard?: (row: T) => React.ReactNode;
  /** Show an "Export CSV" button in the table header area */
  exportable?: boolean;
  /** Enables pagination controls at the bottom of the table */
  paginated?: boolean;
  /** Initial rows-per-page when paginated is true (default 10) */
  defaultPageSize?: number;
  /**
   * When provided a checkbox column is added as the first column.
   * The callback receives the currently-selected rows when the parent
   * calls the provided action trigger.
   */
  onBulkAction?: (selectedRows: T[]) => void;
  /** Label for the bulk-action button (default "Apply") */
  bulkActionLabel?: string;
}

// ---------------------------------------------------------------------------
// Sorting helpers
// ---------------------------------------------------------------------------

function compareValues(a: unknown, b: unknown): number {
  // Nullish values always last
  const aNull = a === null || a === undefined || a === "";
  const bNull = b === null || b === undefined || b === "";
  if (aNull && bNull) return 0;
  if (aNull) return 1;
  if (bNull) return -1;

  // Detect ISO date strings
  if (
    typeof a === "string" &&
    typeof b === "string" &&
    /^\d{4}-\d{2}-\d{2}/.test(a) &&
    /^\d{4}-\d{2}-\d{2}/.test(b)
  ) {
    const da = Date.parse(a);
    const db = Date.parse(b);
    if (!isNaN(da) && !isNaN(db)) return da - db;
  }

  // Numbers
  if (typeof a === "number" && typeof b === "number") return a - b;

  // Numeric strings
  const na = Number(a);
  const nb = Number(b);
  if (!isNaN(na) && !isNaN(nb) && String(a).trim() !== "" && String(b).trim() !== "") {
    return na - nb;
  }

  // Strings (case-insensitive)
  return String(a).toLowerCase().localeCompare(String(b).toLowerCase());
}

// ---------------------------------------------------------------------------
// CSV export helper
// ---------------------------------------------------------------------------

function exportToCSV<T>(columns: Column<T>[], rows: T[]): void {
  // Only export columns that have a meaningful key (skip pure render columns
  // whose key starts with "#" or equals "actions" / "logo_url" etc. — we
  // detect this by checking whether the key resolves to a real value on at
  // least the first row; columns with no accessorKey-equivalent are skipped
  // when they have no matching property on the data and no label worth exporting).
  // More precisely: skip columns where key is "#" or "actions", which are
  // conventional sentinel values, and also skip any column whose every row
  // value is undefined (render-only decoration columns).
  const exportable = columns.filter((col) => {
    if (col.key === "#" || col.key === "actions") return false;
    // Check if the key corresponds to a real field on at least one row
    if (rows.length > 0) {
      const anyHasValue = rows.some(
        (r) => (r as Record<string, unknown>)[col.key] !== undefined
      );
      return anyHasValue;
    }
    return true;
  });

  const header = exportable.map((col) => `"${col.label.replace(/"/g, '""')}"`).join(",");
  const csvRows = rows.map((row) =>
    exportable
      .map((col) => {
        const val = (row as Record<string, unknown>)[col.key];
        if (val === null || val === undefined) return "";
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      })
      .join(",")
  );

  const csv = [header, ...csvRows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `export-${Date.now()}.csv`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DataTable<T>({
  columns,
  data,
  isLoading,
  keyField,
  onRowClick,
  emptyMessage = "No data found.",
  renderHoverCard,
  exportable = false,
  paginated = false,
  defaultPageSize = 10,
  onBulkAction,
  bulkActionLabel = "Apply",
}: DataTableProps<T>) {
  // ── Hover-card state ──────────────────────────────────────────────────────
  const [hoverState, setHoverState] = useState<{ row: T; x: number; y: number } | null>(null);

  // ── Sort state ────────────────────────────────────────────────────────────
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // ── Pagination state ──────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // ── Bulk-select state ─────────────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Reset to page 1 whenever upstream data or sort changes
  useEffect(() => {
    setPage(1);
  }, [data, sortCol, sortDir]);

  // Clear selections when data changes
  useEffect(() => {
    setSelected(new Set());
  }, [data]);

  // ── Key helper ────────────────────────────────────────────────────────────
  const getKey = useCallback(
    (row: T, index: number): string => {
      if (keyField) return String(row[keyField]);
      const r = row as Record<string, unknown>;
      if ("id" in r) return String(r["id"]);
      return String(index);
    },
    [keyField]
  );

  // ── Sorted data ───────────────────────────────────────────────────────────
  const sortedData = useMemo(() => {
    if (!sortCol) return data;
    return [...data].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortCol];
      const bv = (b as Record<string, unknown>)[sortCol];
      const cmp = compareValues(av, bv);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortCol, sortDir]);

  // ── Paginated slice ───────────────────────────────────────────────────────
  const paginatedData = useMemo(() => {
    if (!paginated) return sortedData;
    const start = (page - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, paginated, page, pageSize]);

  const totalPages = paginated ? Math.max(1, Math.ceil(sortedData.length / pageSize)) : 1;
  const rangeStart = paginated ? (page - 1) * pageSize + 1 : 1;
  const rangeEnd = paginated
    ? Math.min(page * pageSize, sortedData.length)
    : sortedData.length;

  // ── Visible rows (what actually renders in the table body) ─────────────────
  const visibleRows = paginatedData;

  // ── Bulk select helpers ───────────────────────────────────────────────────
  const visibleKeys = useMemo(
    () => visibleRows.map((row, i) => getKey(row, i)),
    [visibleRows, getKey]
  );

  const allVisibleSelected =
    visibleKeys.length > 0 && visibleKeys.every((k) => selected.has(k));
  const someVisibleSelected = visibleKeys.some((k) => selected.has(k));

  const toggleAll = () => {
    if (allVisibleSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        visibleKeys.forEach((k) => next.delete(k));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        visibleKeys.forEach((k) => next.add(k));
        return next;
      });
    }
  };

  const toggleRow = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectedRows = useMemo(
    () =>
      sortedData.filter((row, i) => selected.has(getKey(row, i))),
    [sortedData, selected, getKey]
  );

  // ── Sort click handler ────────────────────────────────────────────────────
  const handleSortClick = (col: Column<T>) => {
    if (!col.sortable) return;
    if (sortCol === col.key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col.key);
      setSortDir("asc");
    }
  };

  // ── Hover card helpers ────────────────────────────────────────────────────
  const calcPos = (cx: number, cy: number) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cardW = 300;
    const cardH = 260;
    const x = cx + 20 + cardW > vw ? cx - cardW - 8 : cx + 20;
    const y = cy + cardH > vh - 16 ? Math.max(8, cy - cardH) : cy;
    return { x, y };
  };

  const handleMouseEnter = useCallback(
    (row: T, e: React.MouseEvent) => {
      if (!renderHoverCard) return;
      const { x, y } = calcPos(e.clientX, e.clientY);
      setHoverState({ row, x, y });
    },
    [renderHoverCard]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!hoverState) return;
      const { x, y } = calcPos(e.clientX, e.clientY);
      setHoverState((prev) => (prev ? { ...prev, x, y } : null));
    },
    [hoverState]
  );

  const handleMouseLeave = useCallback(() => {
    setHoverState(null);
  }, []);

  const cardStyle = hoverState ? { left: hoverState.x, top: hoverState.y } : null;

  // ── Effective column count (with optional checkbox column) ────────────────
  const colSpan = columns.length + (onBulkAction ? 1 : 0);

  // ── Sort icon renderer ────────────────────────────────────────────────────
  const SortIcon = ({ col }: { col: Column<T> }) => {
    if (!col.sortable) return null;
    if (sortCol !== col.key)
      return <ChevronsUpDown className="inline ml-1 h-3 w-3 text-gray-300" />;
    return sortDir === "asc" ? (
      <ChevronUp className="inline ml-1 h-3 w-3 text-blue-500" />
    ) : (
      <ChevronDown className="inline ml-1 h-3 w-3 text-blue-500" />
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
        {/* Top bar: shown when exportable or when rows are selected via bulk-action */}
        {(exportable || (onBulkAction && selected.size > 0)) && (
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/60 min-h-[44px]">
            {/* Left side: bulk-select status */}
            <div>
              {onBulkAction && selected.size > 0 ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {selected.size} selected
                  </span>
                  <button
                    onClick={() => onBulkAction(selectedRows)}
                    className="px-3 py-1 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    {bulkActionLabel}
                  </button>
                  <button
                    onClick={() => setSelected(new Set())}
                    className="px-3 py-1 text-xs font-medium rounded-md border border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <span />
              )}
            </div>

            {/* Right side: export button */}
            {exportable && (
              <button
                onClick={() => exportToCSV(columns, sortedData)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </button>
            )}
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800">
              {/* Checkbox: select-all */}
              {onBulkAction && (
                <TableHead className="w-10 px-3 sm:px-4 py-3 sm:py-3.5 h-auto">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someVisibleSelected && !allVisibleSelected;
                    }}
                    onChange={toggleAll}
                    aria-label="Select all visible rows"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </TableHead>
              )}

              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  onClick={() => handleSortClick(col)}
                  className={`text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-3 sm:px-5 py-3 sm:py-3.5 h-auto whitespace-nowrap${col.sortable ? " cursor-pointer select-none hover:text-gray-600 dark:hover:text-gray-300" : ""}`}
                >
                  {col.label}
                  <SortIcon col={col} />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-b border-gray-50 dark:border-gray-700">
                  {onBulkAction && (
                    <TableCell className="px-3 sm:px-4 py-3 sm:py-3.5">
                      <Skeleton className="h-4 w-4 dark:bg-gray-700" />
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell key={col.key} className="px-3 sm:px-5 py-3 sm:py-3.5">
                      <Skeleton className="h-4 w-full dark:bg-gray-700" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : visibleRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={colSpan}
                  className="text-center text-gray-400 text-sm py-12"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              visibleRows.map((row, index) => {
                const rowKey = getKey(row, (page - 1) * pageSize + index);
                const isSelected = selected.has(rowKey);

                return (
                  <tr
                    key={rowKey}
                    onClick={() => onRowClick?.(row)}
                    onMouseEnter={(e) => handleMouseEnter(row, e)}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    className={`border-b border-gray-50 dark:border-gray-700 last:border-0 transition-colors duration-150 ${
                      isSelected
                        ? "bg-blue-50/50 dark:bg-blue-900/20"
                        : onRowClick
                        ? "cursor-pointer hover:bg-blue-50/30 dark:hover:bg-blue-900/20"
                        : "hover:bg-gray-50/60 dark:hover:bg-gray-700/50"
                    }`}
                  >
                    {/* Row checkbox */}
                    {onBulkAction && (
                      <td
                        className="px-3 sm:px-4 py-3 sm:py-3.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(rowKey)}
                          aria-label="Select row"
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                    )}

                    {columns.map((col, colIndex) => (
                      <td
                        key={col.key}
                        className={`px-3 sm:px-5 py-3 sm:py-3.5 text-sm ${
                          colIndex === 0 && !onBulkAction
                            ? "font-medium text-gray-800 dark:text-gray-100"
                            : "text-gray-600 dark:text-gray-300"
                        }`}
                      >
                        {col.render
                          ? col.render(row, (page - 1) * pageSize + index)
                          : String((row as Record<string, unknown>)[col.key] ?? "—")}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination bar */}
        {paginated && !isLoading && sortedData.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/40 dark:bg-gray-800/40 text-sm">
            <span className="text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
              Showing {rangeStart}–{rangeEnd} of {sortedData.length}
            </span>

            <div className="flex items-center gap-2">
              {/* Page size selector */}
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="h-7 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-200 px-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                aria-label="Rows per page"
              >
                {[10, 25, 50].map((n) => (
                  <option key={n} value={n}>
                    {n} / page
                  </option>
                ))}
              </select>

              {/* Prev */}
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-7 px-2.5 rounded-md border border-gray-200 dark:border-gray-600 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Prev
              </button>

              {/* Page indicator */}
              <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[60px] text-center">
                {page} / {totalPages}
              </span>

              {/* Next */}
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-7 px-2.5 rounded-md border border-gray-200 dark:border-gray-600 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hover preview portal */}
      {hoverState && renderHoverCard && cardStyle && typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed z-[9999] pointer-events-none"
            style={{ left: cardStyle.left, top: cardStyle.top }}
          >
            <div className="animate-in fade-in-0 zoom-in-95 duration-150">
              {renderHoverCard(hoverState.row)}
            </div>
          </div>,
          document.body
        )
      }
    </>
  );
}
