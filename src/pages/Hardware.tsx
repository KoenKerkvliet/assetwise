import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, MapPin, Calendar, Pencil, Archive, Trash2, CheckSquare, X, Download } from 'lucide-react'
import { useHardware, type HardwareWithIncidents } from '@/hooks/useHardware'
import { supabase } from '@/lib/supabase'
import { exportHardwarePdf } from '@/lib/exportPdf'
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
  if (item.worstOpenIncidentType) {
    if (RED_INCIDENT_TYPES.has(item.worstOpenIncidentType)) return 'border-red-500'
    return 'border-orange-500'
  }
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

const fmt = (v: number) =>
  new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(v)

interface HardwareCardProps {
  item: HardwareWithIncidents
  selectMode: boolean
  selected: boolean
  onToggle: (id: string) => void
}

function HardwareCard({ item, selectMode, selected, onToggle }: HardwareCardProps) {
  const navigate = useNavigate()
  const priceNum = item.price != null ? Number(item.price) : null
  const hasPrice = priceNum != null && !isNaN(priceNum)

  return (
    <Card
      className={cn(
        'flex flex-col overflow-hidden p-0 transition-shadow',
        getCardBorderClass(item),
        selectMode && 'cursor-pointer',
        selected && 'ring-2 ring-primary shadow-md'
      )}
      onClick={selectMode ? () => onToggle(item.id) : undefined}
    >
      <div className="flex items-center justify-between bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground">
        <span className="flex items-center gap-2 truncate">
          {selectMode && (
            <span className={cn(
              'flex h-4 w-4 items-center justify-center rounded border',
              selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40'
            )}>
              {selected && <CheckSquare className="h-3 w-3" />}
            </span>
          )}
          {item.device_type}
        </span>
        {!selectMode && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 shrink-0"
            onClick={() => navigate(`/hardware/${item.id}`)}
          >
            <Pencil className="h-3 w-3" />
          </Button>
        )}
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
          {hasPrice && (
            <span className="shrink-0 whitespace-nowrap font-medium">
              {item.residualValue != null ? (
                <>
                  <span className="text-foreground">{fmt(item.residualValue)}</span>
                  <span className="text-muted-foreground"> / {fmt(priceNum)}</span>
                </>
              ) : (
                <span className="text-foreground">{fmt(priceNum)}</span>
              )}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function HardwarePage() {
  const { data, loading, error, refresh } = useHardware('active')
  const [globalFilter, setGlobalFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [locationFilter, setLocationFilter] = useState('all')

  // Multi-select
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmAction, setConfirmAction] = useState<'archive' | 'delete' | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const exitSelectMode = () => {
    setSelectMode(false)
    setSelected(new Set())
    setConfirmAction(null)
  }

  const performAction = async (action: 'archive' | 'delete') => {
    if (selected.size === 0) return
    setActionLoading(true)

    const newStatus = action === 'archive' ? 'archived' : 'deleted'
    const ids = [...selected]

    const { error: err } = await supabase
      .from('hardware')
      .update({ status: newStatus })
      .in('id', ids)

    setActionLoading(false)
    if (!err) {
      exitSelectMode()
      refresh()
    }
  }

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

  const selectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map((h) => h.id)))
    }
  }

  if (error) {
    return <p className="text-destructive">Fout bij laden: {error}</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Hardware</h1>
        <Button
          variant={selectMode ? 'secondary' : 'outline'}
          size="sm"
          onClick={selectMode ? exitSelectMode : () => setSelectMode(true)}
        >
          {selectMode ? <><X className="mr-1 h-4 w-4" /> Annuleren</> : <><CheckSquare className="mr-1 h-4 w-4" /> Selecteren</>}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const items = selectMode && selected.size > 0
              ? filtered.filter((h) => selected.has(h.id))
              : filtered
            exportHardwarePdf(items, selectMode && selected.size > 0 ? 'Hardware selectie' : 'Hardware overzicht')
          }}
        >
          <Download className="mr-1 h-4 w-4" /> PDF
        </Button>
      </div>

      {/* Selection action bar */}
      {selectMode && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
          <Button variant="outline" size="sm" onClick={selectAll}>
            {selected.size === filtered.length ? 'Deselecteer alles' : 'Selecteer alles'}
          </Button>
          <span className="text-sm text-muted-foreground">{selected.size} geselecteerd</span>
          <div className="ml-auto flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={selected.size === 0}
              onClick={() => setConfirmAction('archive')}
            >
              <Archive className="mr-1 h-4 w-4" /> Archiveren
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={selected.size === 0}
              onClick={() => setConfirmAction('delete')}
            >
              <Trash2 className="mr-1 h-4 w-4" /> Verwijderen
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation dialog */}
      {confirmAction && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium">
            Weet je zeker dat je {selected.size} item(s) wilt {confirmAction === 'archive' ? 'archiveren' : 'verwijderen'}?
          </p>
          <p className="mb-3 text-xs text-muted-foreground">
            {confirmAction === 'archive'
              ? 'Gearchiveerde items kun je terugvinden en herstellen via Archief.'
              : 'Verwijderde items kun je terugvinden via Prullenbak en daar definitief verwijderen of herstellen.'}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={confirmAction === 'delete' ? 'destructive' : 'default'}
              disabled={actionLoading}
              onClick={() => performAction(confirmAction)}
            >
              {actionLoading ? 'Bezig...' : confirmAction === 'archive' ? 'Ja, archiveren' : 'Ja, verwijderen'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setConfirmAction(null)}>
              Annuleren
            </Button>
          </div>
        </div>
      )}

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
          <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle types</SelectItem>
            {uniqueTypes.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle statussen</SelectItem>
            {uniqueStatuses.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger><SelectValue placeholder="Locatie" /></SelectTrigger>
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
            <HardwareCard
              key={item.id}
              item={item}
              selectMode={selectMode}
              selected={selected.has(item.id)}
              onToggle={toggleSelect}
            />
          ))}
        </div>
      )}

      <p className="text-sm text-muted-foreground">{filtered.length} item(s)</p>
    </div>
  )
}
