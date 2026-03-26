import { useMemo, useState } from 'react'
import { Search, MapPin, Calendar, Tag } from 'lucide-react'
import { useHardware } from '@/hooks/useHardware'
import type { Hardware } from '@/types/database'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const PAGE_SIZE = 24

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

function HardwareCard({ item }: { item: Hardware }) {
  const price = item.price != null
    ? new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(item.price)
    : null
  const date = item.purchase_date
    ? new Date(item.purchase_date).toLocaleDateString('nl-NL')
    : null

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div className="min-w-0">
          <p className="truncate font-mono text-sm font-medium">{item.asset_id}</p>
          <p className="truncate text-sm text-muted-foreground">
            {item.brand ?? item.device_type}
          </p>
        </div>
        <StatusBadge status={item.device_status} />
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2 pt-0 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Tag className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{item.device_type}</span>
        </div>
        {item.location && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{item.location}</span>
          </div>
        )}
        {date && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>{date}</span>
          </div>
        )}
        <div className="mt-auto pt-2 text-xs text-muted-foreground">
          <p className="truncate">S/N: {item.serial_numbers?.join(', ') ?? '-'}</p>
          {price && <p className="mt-1 font-medium text-foreground">{price}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

export default function HardwarePage() {
  const { data, loading, error } = useHardware()
  const [globalFilter, setGlobalFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [locationFilter, setLocationFilter] = useState('all')
  const [page, setPage] = useState(0)

  const uniqueTypes = useMemo(() => [...new Set(data.map(h => h.device_type))].sort(), [data])
  const uniqueStatuses = useMemo(() => [...new Set(data.map(h => h.device_status))].sort(), [data])
  const uniqueLocations = useMemo(
    () => [...new Set(data.map(h => h.location).filter(Boolean))].sort() as string[],
    [data]
  )

  const filtered = useMemo(() => {
    let result = data
    if (globalFilter) {
      const q = globalFilter.toLowerCase()
      result = result.filter(h =>
        h.asset_id.toLowerCase().includes(q) ||
        h.serial_numbers?.some(s => s.toLowerCase().includes(q)) ||
        h.device_type.toLowerCase().includes(q) ||
        h.brand?.toLowerCase().includes(q) ||
        h.location?.toLowerCase().includes(q)
      )
    }
    if (typeFilter !== 'all') result = result.filter(h => h.device_type === typeFilter)
    if (statusFilter !== 'all') result = result.filter(h => h.device_status === statusFilter)
    if (locationFilter !== 'all') result = result.filter(h => h.location === locationFilter)
    return result
  }, [data, globalFilter, typeFilter, statusFilter, locationFilter])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  // Reset page when filters change
  const setFilterAndReset = (setter: (v: string) => void) => (v: string) => {
    setter(v)
    setPage(0)
  }

  if (error) {
    return <p className="text-destructive">Fout bij laden: {error}</p>
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Hardware</h1>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Zoeken..."
            value={globalFilter}
            onChange={(e) => { setGlobalFilter(e.target.value); setPage(0) }}
            className="pl-9"
          />
        </div>

        <Select value={typeFilter} onValueChange={setFilterAndReset(setTypeFilter)}>
          <SelectTrigger>
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle types</SelectItem>
            {uniqueTypes.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setFilterAndReset(setStatusFilter)}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle statussen</SelectItem>
            {uniqueStatuses.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={locationFilter} onValueChange={setFilterAndReset(setLocationFilter)}>
          <SelectTrigger>
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

      {/* Cards grid */}
      {loading ? (
        <p className="py-12 text-center text-muted-foreground">Laden...</p>
      ) : paged.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">Geen resultaten gevonden.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {paged.map((item) => (
            <HardwareCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
        <p className="text-sm text-muted-foreground">
          {filtered.length} item(s)
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => p - 1)}
            disabled={page === 0}
          >
            Vorige
          </Button>
          <span className="text-sm text-muted-foreground">
            {page + 1} / {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => p + 1)}
            disabled={page >= pageCount - 1}
          >
            Volgende
          </Button>
        </div>
      </div>
    </div>
  )
}
