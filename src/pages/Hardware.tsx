import { useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table'
import { ArrowUpDown, Search } from 'lucide-react'
import { useHardware } from '@/hooks/useHardware'
import type { Hardware } from '@/types/database'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function StatusBadge({ status }: { status: string }) {
  const variant = (() => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'actief':
        return 'default' as const
      case 'in_repair':
      case 'in reparatie':
        return 'secondary' as const
      case 'inactive':
      case 'inactief':
      case 'retired':
        return 'outline' as const
      default:
        return 'secondary' as const
    }
  })()

  return <Badge variant={variant}>{status}</Badge>
}

export default function HardwarePage() {
  const { data, loading, error } = useHardware()
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const uniqueTypes = useMemo(() => [...new Set(data.map(h => h.device_type))].sort(), [data])
  const uniqueStatuses = useMemo(() => [...new Set(data.map(h => h.device_status))].sort(), [data])
  const uniqueLocations = useMemo(
    () => [...new Set(data.map(h => h.location).filter(Boolean))].sort() as string[],
    [data]
  )

  const columns = useMemo<ColumnDef<Hardware>[]>(
    () => [
      {
        accessorKey: 'asset_id',
        header: ({ column }) => (
          <Button variant="ghost" size="sm" onClick={() => column.toggleSorting()}>
            Asset ID <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        ),
        cell: ({ getValue }) => (
          <span className="font-mono text-sm">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: 'serial_numbers',
        header: 'Serienummer(s)',
        cell: ({ getValue }) => {
          const serials = getValue<string[]>()
          return serials?.join(', ') ?? '-'
        },
        enableSorting: false,
      },
      {
        accessorKey: 'device_type',
        header: ({ column }) => (
          <Button variant="ghost" size="sm" onClick={() => column.toggleSorting()}>
            Type <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        ),
        filterFn: 'equals',
      },
      {
        accessorKey: 'brand',
        header: ({ column }) => (
          <Button variant="ghost" size="sm" onClick={() => column.toggleSorting()}>
            Merk <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        ),
        cell: ({ getValue }) => getValue<string>() ?? '-',
      },
      {
        accessorKey: 'device_status',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
        filterFn: 'equals',
      },
      {
        accessorKey: 'location',
        header: ({ column }) => (
          <Button variant="ghost" size="sm" onClick={() => column.toggleSorting()}>
            Locatie <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        ),
        cell: ({ getValue }) => getValue<string>() ?? '-',
        filterFn: 'equals',
      },
      {
        accessorKey: 'purchase_date',
        header: ({ column }) => (
          <Button variant="ghost" size="sm" onClick={() => column.toggleSorting()}>
            Aanschafdatum <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        ),
        cell: ({ getValue }) => {
          const date = getValue<string>()
          return date ? new Date(date).toLocaleDateString('nl-NL') : '-'
        },
      },
      {
        accessorKey: 'price',
        header: ({ column }) => (
          <Button variant="ghost" size="sm" onClick={() => column.toggleSorting()}>
            Prijs <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        ),
        cell: ({ getValue }) => {
          const price = getValue<number>()
          return price != null
            ? new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(price)
            : '-'
        },
      },
    ],
    []
  )

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  })

  if (error) {
    return <p className="text-destructive">Fout bij laden: {error}</p>
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Hardware</h1>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Zoeken..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={(table.getColumn('device_type')?.getFilterValue() as string) ?? 'all'}
          onValueChange={(v) =>
            table.getColumn('device_type')?.setFilterValue(v === 'all' ? undefined : v)
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle types</SelectItem>
            {uniqueTypes.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={(table.getColumn('device_status')?.getFilterValue() as string) ?? 'all'}
          onValueChange={(v) =>
            table.getColumn('device_status')?.setFilterValue(v === 'all' ? undefined : v)
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle statussen</SelectItem>
            {uniqueStatuses.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={(table.getColumn('location')?.getFilterValue() as string) ?? 'all'}
          onValueChange={(v) =>
            table.getColumn('location')?.setFilterValue(v === 'all' ? undefined : v)
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Locatie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle locaties</SelectItem>
            {uniqueLocations.map((l) => (
              <SelectItem key={l} value={l}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Laden...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Geen resultaten gevonden.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} item(s)
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Vorige
          </Button>
          <span className="text-sm text-muted-foreground">
            Pagina {table.getState().pagination.pageIndex + 1} van{' '}
            {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Volgende
          </Button>
        </div>
      </div>
    </div>
  )
}
