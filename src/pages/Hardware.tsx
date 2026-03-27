import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, MapPin, Calendar, Pencil } from 'lucide-react'
import { useHardware, type HardwareWithIncidents } from '@/hooks/useHardware'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const RED_INCIDENT_TYPES = new Set(['reparatie', 'defect'])

function getCardBorderClass(item: HardwareWithIncidents) {
  // Open incidents take priority over device status
  if (item.worstOpenIncidentType) {
    if (RED_INCIDENT_TYPES.has(item.worstOpenIncidentType)) return 'border-red-500'
    return 'border-orange-500' // storing, melding, overig
  }
  // Fallback to device status
  switch (item.device_status?.toLowerCase()) {
    case 'active':
    case 'actief':
      return 'border-green-500'
    case 'in_repair':
    case 'in reparatie':
      return 'border-orange-500'
    case 'inactive':
    case 'inactief':
    case 'retired':
    case 'defect':
      return 'border-red-500'
    default:
      return 'border-green-500'
  }
}

function HardwareCard({ item }: { item: HardwareWithIncidents }) {
  const navigate = useNavigate()
  const priceNum = item.price != null ? Number(item.price) : null
  const price = priceNum != null && !isNaN(priceNum)
    ? new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(priceNum)
    : null

  return (
    <Card className={cn('flex flex-col overflow-hidden p-0', getCardBorderClass(item))}>
      <div className="flex items-center justify-between bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground">
        <span className="truncate">{item.device_type}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 shrink-0"
          onClick={() => navigate(`/hardware/${item.id}`)}
        >
          <Pencil className="h-3 w-3" />
        </Button>
      </div>
      <CardContent className="flex flex-1 flex-col gap-1 px-3 py-1.5 text-xs">
        <span className="truncate font-mono text-sm font-medium leading-tight">{item.asset_id}</span>
        <p className="truncate text-muted-foreground">{item.brand ?? '-'}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
          {item.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{item.location}</span>}
          {item.purchase_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(item.purchase_date).toLocaleDateString('nl-NL')}</span>}
        </div>
        <Separator className="mt-auto" />
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-muted-foreground">S/N: {item.serial_numbers?.join(', ') ?? '-'}</p>
          {price && <span className="shrink-0 font-medium text-foreground">{price}</span>}
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
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
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

        <Select value={statusFilter} onValueChange={setStatusFilter}>
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

        <Select value={locationFilter} onValueChange={setLocationFilter}>
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
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">Geen resultaten gevonden.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((item) => (
            <HardwareCard key={item.id} item={item} />
          ))}
        </div>
      )}

      <p className="text-sm text-muted-foreground">{filtered.length} item(s)</p>
    </div>
  )
}
