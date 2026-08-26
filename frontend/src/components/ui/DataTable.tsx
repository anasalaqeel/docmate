import type { ReactNode } from "react";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Spinner,
} from "@heroui/react";

export interface DataTableColumn<TKey extends string = string> {
  key: TKey;
  label: string;
  sortable?: boolean;
  align?: "start" | "center" | "end";
}

export interface DataTableProps<T, TKey extends string = string> {
  columns: DataTableColumn<TKey>[];
  data: T[];
  getRowKey: (item: T) => string | number;
  renderCell: (item: T, columnKey: TKey) => ReactNode;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: TKey) => void;
  isLoading?: boolean;
  emptyContent?: ReactNode;
  ariaLabel?: string;
}

export function DataTable<T, TKey extends string = string>({
  columns,
  data,
  getRowKey,
  renderCell,
  sortBy,
  sortOrder,
  onSort,
  isLoading = false,
  emptyContent,
  ariaLabel = "Data table",
}: DataTableProps<T, TKey>) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <Spinner size="lg" label="Loading..." />
      </div>
    );
  }

  if (data.length === 0 && emptyContent) {
    return <>{emptyContent}</>;
  }

  return (
    <Table aria-label={ariaLabel} removeWrapper>
      <TableHeader>
        {columns.map((column) => (
          <TableColumn
            key={column.key}
            align={column.align || "start"}
            className={`bg-transparent border-b border-[var(--docmate-border-color)] ${
              column.sortable ? "cursor-pointer hover:opacity-80 transition-opacity" : ""
            }`}
          >
            {column.sortable && onSort ? (
              <div
                className="flex items-center justify-between gap-2"
                onClick={() => onSort(column.key)}
              >
                <span>{column.label}</span>
                <span className="text-xs" style={{ color: 'var(--docmate-text-secondary)' }}>
                  {sortBy === column.key ? (
                    sortOrder === "asc" ? "↑" : "↓"
                  ) : (
                    <span className="opacity-30">↕</span>
                  )}
                </span>
              </div>
            ) : column.align === "center" ? (
              <div className="flex justify-center">{column.label}</div>
            ) : (
              column.label
            )}
          </TableColumn>
        ))}
      </TableHeader>
      <TableBody>
        {data.map((item) => (
          <TableRow
            key={getRowKey(item)}
            className="border-b border-[var(--docmate-border-color)]/50 last:border-0 hover:bg-[var(--docmate-surface-alt)]/30 transition-colors"
          >
            {columns.map((column) => (
              <TableCell key={column.key}>{renderCell(item, column.key)}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
