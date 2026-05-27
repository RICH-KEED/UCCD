"use client";

import {
  type ColumnDef,
  type ColumnFiltersState,
  type FilterFn,
  flexRender,
  getCoreRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type Row,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  ChevronDownIcon,
  ChevronFirstIcon,
  ChevronLastIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  CheckIcon,
  CircleXIcon,
  Columns3Icon,
  ListFilterIcon,
} from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ─── Generic multi-column search filter ────────────────────────────
export const multiColumnFilterFn: FilterFn<any> = (
  row,
  _columnId,
  filterValue,
) => {
  const searchable = Object.values(row.original as Record<string, unknown>)
    .map((v) => String(v ?? ""))
    .join(" ")
    .toLowerCase();
  return searchable.includes((filterValue ?? "").toString().toLowerCase());
};

// ─── Generic value-in-array filter (for badge/pill filters) ────────
export const valueInArrayFilterFn: FilterFn<any> = (
  row,
  columnId,
  filterValue: string[],
) => {
  if (!filterValue?.length) return true;
  const val = String(row.getValue(columnId) ?? "");
  return filterValue.includes(val);
};

// ─── Props ─────────────────────────────────────────────────────────
export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  /** Column ID to use for the search input filter (must have filterFn set) */
  searchColumn?: string;
  searchPlaceholder?: string;
  /** Column ID(s) to show as faceted badge filters in the toolbar */
  filterColumns?: string[];
  /** Enable row selection checkboxes */
  enableRowSelection?: boolean;
  /** Enable pagination (default: true) */
  enablePagination?: boolean;
  /** Default page size (default: 10) */
  defaultPageSize?: number;
  /** Initial sorting state */
  defaultSorting?: SortingState;
  /** Extra toolbar content rendered on the right side */
  toolbarRight?: React.ReactNode;
  /** Callback when selected rows change */
  onSelectionChange?: (rows: Row<TData>[]) => void;
  /** Custom class for the wrapper div */
  className?: string;
  /** Default column visibility state */
  defaultColumnVisibility?: VisibilityState;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchColumn,
  searchPlaceholder = "Filter...",
  filterColumns = [],
  enableRowSelection = false,
  enablePagination = true,
  defaultPageSize = 10,
  defaultSorting = [],
  toolbarRight,
  onSelectionChange,
  className,
  defaultColumnVisibility = {},
}: DataTableProps<TData, TValue>) {
  const id = useId();
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(defaultColumnVisibility);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: defaultPageSize,
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const [sorting, setSorting] = useState<SortingState>(defaultSorting);

  // Add select column if row selection enabled
  const allColumns = useMemo(() => {
    if (!enableRowSelection) return columns;
    const selectCol: ColumnDef<TData, TValue> = {
      cell: ({ row }) => (
        <Checkbox
          aria-label="Select row"
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
        />
      ),
      enableHiding: false,
      enableSorting: false,
      header: ({ table }) => (
        <Checkbox
          aria-label="Select all"
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        />
      ),
      id: "select",
      size: 28,
    };
    return [selectCol, ...columns] as ColumnDef<TData, TValue>[];
  }, [columns, enableRowSelection]);

  const table = useReactTable({
    columns: allColumns,
    data,
    enableSortingRemoval: false,
    enableRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    state: {
      columnFilters,
      columnVisibility,
      pagination,
      sorting,
    },
  });

  // Notify parent of selection changes
  const selectedRows = table.getSelectedRowModel().rows;
  if (onSelectionChange) {
    // Use a microtask to avoid setState during render
    queueMicrotask(() => onSelectionChange(selectedRows));
  }

  // ─── Filter column helpers ────────────────────────────────────────
  const filterColumnInfo = useMemo(() => {
    return filterColumns
      .map((colId) => {
        const col = table.getColumn(colId);
        if (!col) return null; // Skip non-existent columns gracefully
        const uniqueValues = Array.from(col.getFacetedUniqueValues().keys()).sort();
        const counts = col.getFacetedUniqueValues();
        const selected: string[] =
          (col.getFilterValue() as string[]) ?? [];
        return { colId, uniqueValues, counts, selected };
      })
      .filter(Boolean) as { colId: string; uniqueValues: string[]; counts: Map<unknown, number>; selected: string[] }[];
  }, [columnFilters, filterColumns, table]);

  const handleFilterChange = (
    colId: string,
    checked: boolean | "indeterminate",
    value: string,
  ) => {
    const col = table.getColumn(colId);
    const filterValue = new Set(((col?.getFilterValue() as string[]) ?? []).map(String));
    if (checked === true) {
      filterValue.add(value);
    } else {
      filterValue.delete(value);
    }
    const nextFilterValue = Array.from(filterValue);
    col?.setFilterValue(nextFilterValue.length ? nextFilterValue : undefined);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* ── Filters Toolbar ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Search input */}
          {searchColumn && (
            <div className="relative">
              <Input
                aria-label={searchPlaceholder}
                className={cn(
                  "peer min-w-60 ps-9",
                  Boolean(table.getColumn(searchColumn)?.getFilterValue()) &&
                    "pe-9",
                )}
                id={`${id}-search`}
                onChange={(e) =>
                  table.getColumn(searchColumn)?.setFilterValue(e.target.value)
                }
                placeholder={searchPlaceholder}
                ref={inputRef}
                type="text"
                value={
                  (table.getColumn(searchColumn)?.getFilterValue() ?? "") as string
                }
              />
              <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-muted-foreground/80 peer-disabled:opacity-50">
                <ListFilterIcon aria-hidden="true" size={16} />
              </div>
              {Boolean(table.getColumn(searchColumn)?.getFilterValue()) && (
                <button
                  aria-label="Clear filter"
                  className="absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md text-muted-foreground/80 outline-none transition-[color,box-shadow] hover:text-foreground focus:z-10 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => {
                    table.getColumn(searchColumn)?.setFilterValue("");
                    inputRef.current?.focus();
                  }}
                  type="button"
                >
                  <CircleXIcon aria-hidden="true" size={16} />
                </button>
              )}
            </div>
          )}

          {/* Faceted filter popovers */}
          {filterColumnInfo.map(({ colId, uniqueValues, counts, selected }) => (
            <Popover key={colId}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="capitalize">
                  <Columns3Icon
                    aria-hidden="true"
                    className="-ms-1 opacity-60"
                    size={16}
                  />
                  {colId}
                  {selected.length > 0 && (
                    <span className="-me-1 inline-flex h-5 max-h-full items-center rounded border bg-background px-1 font-[inherit] font-medium text-[0.625rem] text-muted-foreground/70">
                      {selected.length}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto min-w-36 p-3">
                <div className="space-y-3">
                  <div className="font-medium text-muted-foreground text-xs">
                    Filters
                  </div>
                  <div className="space-y-1">
                    {uniqueValues.map((rawValue, i) => {
                      const value = String(rawValue);
                      const checked = selected.includes(value);
                      return (
                        <div
                          aria-checked={checked}
                          className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-1 py-1.5 text-left text-sm outline-none hover:bg-accent focus-visible:bg-accent"
                          key={`${colId}-${value}`}
                          onClick={() => handleFilterChange(colId, !checked, value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              handleFilterChange(colId, !checked, value);
                            }
                          }}
                          role="checkbox"
                          tabIndex={0}
                        >
                          <span
                            aria-hidden="true"
                            className={cn(
                              "flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input shadow-xs transition-colors",
                              checked && "border-primary bg-primary text-primary-foreground",
                            )}
                          >
                            {checked && <CheckIcon className="size-3" />}
                          </span>
                          <span className="flex grow justify-between gap-2 font-normal">
                            <span className="truncate">{value}</span>
                            <span className="ms-2 text-muted-foreground text-xs">
                              {counts.get(rawValue)}
                            </span>
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          ))}

          {/* Toggle columns visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Columns3Icon
                  aria-hidden="true"
                  className="-ms-1 opacity-60"
                  size={16}
                />
                View
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    checked={column.getIsVisible()}
                    className="capitalize"
                    key={column.id}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    onSelect={(event) => event.preventDefault()}
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right toolbar slot */}
        {toolbarRight && (
          <div className="flex items-center gap-3">{toolbarRight}</div>
        )}
      </div>

      {/* ── Table ────────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-md border bg-background">
        <Table className="w-full table-auto">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow className="hover:bg-transparent" key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    className="h-11"
                    key={header.id}
                  >
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <div
                        className={cn(
                          header.column.getCanSort() &&
                            "flex h-full cursor-pointer select-none items-center justify-between gap-2",
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                        onKeyDown={(e) => {
                          if (
                            header.column.getCanSort() &&
                            (e.key === "Enter" || e.key === " ")
                          ) {
                            e.preventDefault();
                            header.column.getToggleSortingHandler()?.(e);
                          }
                        }}
                        tabIndex={header.column.getCanSort() ? 0 : undefined}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {{
                          asc: (
                            <ChevronUpIcon
                              aria-hidden="true"
                              className="shrink-0 opacity-60"
                              size={16}
                            />
                          ),
                          desc: (
                            <ChevronDownIcon
                              aria-hidden="true"
                              className="shrink-0 opacity-60"
                              size={16}
                            />
                          ),
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                    ) : (
                      flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  data-state={row.getIsSelected() && "selected"}
                  key={row.id}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell className="last:py-0" key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  className="h-24 text-center"
                  colSpan={allColumns.length}
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Pagination ───────────────────────────────────────────── */}
      {enablePagination && (
        <div className="flex items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <Label className="max-sm:sr-only" htmlFor={id}>
              Rows per page
            </Label>
            <Select
              onValueChange={(value) => {
                table.setPageSize(Number(value));
              }}
              value={table.getState().pagination.pageSize.toString()}
            >
              <SelectTrigger className="w-fit whitespace-nowrap" id={id}>
                <SelectValue placeholder="Select number of results" />
              </SelectTrigger>
              <SelectContent className="[&_*[role=option]>span]:start-auto [&_*[role=option]>span]:end-2 [&_*[role=option]]:ps-2 [&_*[role=option]]:pe-8">
                {[5, 10, 25, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={pageSize.toString()}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex grow justify-end whitespace-nowrap text-muted-foreground text-sm">
            <p aria-live="polite" className="whitespace-nowrap text-muted-foreground text-sm">
              <span className="text-foreground">
                {table.getState().pagination.pageIndex *
                  table.getState().pagination.pageSize +
                  1}
                -
                {Math.min(
                  Math.max(
                    table.getState().pagination.pageIndex *
                      table.getState().pagination.pageSize +
                      table.getState().pagination.pageSize,
                    0,
                  ),
                  table.getRowCount(),
                )}
              </span>{" "}
              of{" "}
              <span className="text-foreground">
                {table.getRowCount().toString()}
              </span>
            </p>
          </div>
          <div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <Button
                    aria-label="Go to first page"
                    className="disabled:pointer-events-none disabled:opacity-50"
                    disabled={!table.getCanPreviousPage()}
                    onClick={() => table.firstPage()}
                    size="icon"
                    variant="outline"
                  >
                    <ChevronFirstIcon aria-hidden="true" size={16} />
                  </Button>
                </PaginationItem>
                <PaginationItem>
                  <Button
                    aria-label="Go to previous page"
                    className="disabled:pointer-events-none disabled:opacity-50"
                    disabled={!table.getCanPreviousPage()}
                    onClick={() => table.previousPage()}
                    size="icon"
                    variant="outline"
                  >
                    <ChevronLeftIcon aria-hidden="true" size={16} />
                  </Button>
                </PaginationItem>
                <PaginationItem>
                  <Button
                    aria-label="Go to next page"
                    className="disabled:pointer-events-none disabled:opacity-50"
                    disabled={!table.getCanNextPage()}
                    onClick={() => table.nextPage()}
                    size="icon"
                    variant="outline"
                  >
                    <ChevronRightIcon aria-hidden="true" size={16} />
                  </Button>
                </PaginationItem>
                <PaginationItem>
                  <Button
                    aria-label="Go to last page"
                    className="disabled:pointer-events-none disabled:opacity-50"
                    disabled={!table.getCanNextPage()}
                    onClick={() => table.lastPage()}
                    size="icon"
                    variant="outline"
                  >
                    <ChevronLastIcon aria-hidden="true" size={16} />
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      )}
    </div>
  );
}
