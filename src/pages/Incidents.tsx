import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Pencil, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Hardware, HardwareAction } from '@/types/database'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

function statusBadgeClass(status: string) {
  switch (status) {
    case 'open': return 'bg-amber-100 text-amber-700'
    case 'in_behandeling': return 'bg-blue-100 text-blue-700'
    case 'afgehandeld': return 'bg-green-100 text-green-700'
    default: return 'bg-gray-100 text-gray-700'
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'open': return 'Open'
    case 'in_behandeling': return 'In behandeling'
    case 'afgehandeld': return 'Afgehandeld'
    default: return status
  }
}

function typeLabel(type: string) {
  switch (type) {
    case 'storing': return 'Storing'
    case 'reparatie': return 'Reparatie'
    case 'melding': return 'Melding'
    case 'defect': return 'Defect'
    case 'overig': return 'Overig'
    default: return type
  }
}

interface IncidentWithDevice extends HardwareAction {
  hardware?: Hardware
}

export default function IncidentsPage() {
  const navigate = useNavigate()
  const [incidents, setIncidents] = useState<IncidentWithDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('open_active')
  const [typeFilter, setTypeFilter] = useState('all')

  const fetchData = async () => {
    const [actionsRes, hwRes] = await Promise.all([
      supabase.from('hardware_actions').select('*').order('created_at', { ascending: false }),
      supabase.from('hardware').select('*'),
    ])

    const hwMap = new Map<string, Hardware>()
    for (const hw of hwRes.data ?? []) {
      hwMap.set(hw.id, hw)
    }

    const enriched: IncidentWithDevice[] = (actionsRes.data ?? []).map((a) => ({
      ...a,
      hardware: hwMap.get(a.hardware_id),
    }))

    setIncidents(enriched)
    setLoading(false)
  }

  if (loading && incidents.length === 0) {
    fetchData()
  }

  const uniqueTypes = useMemo(
    () => [...new Set(incidents.map((i) => i.action_type))].sort(),
    [incidents]
  )

  const filtered = useMemo(() => {
    let result = incidents

    // Status filter
    if (statusFilter === 'open_active') {
      result = result.filter((i) => i.status !== 'afgehandeld')
    } else if (statusFilter !== 'all') {
      result = result.filter((i) => i.status === statusFilter)
    }

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter((i) => i.action_type === typeFilter)
    }

    // Search
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((i) =>
        i.title.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q) ||
        i.incident_number?.toLowerCase().includes(q) ||
        i.involved?.toLowerCase().includes(q) ||
        i.hardware?.asset_id.toLowerCase().includes(q) ||
        i.hardware?.brand?.toLowerCase().includes(q) ||
        i.hardware?.device_type.toLowerCase().includes(q)
      )
    }

    return result
  }, [incidents, statusFilter, typeFilter, search])

  const openCount = incidents.filter((i) => i.status !== 'afgehandeld').length

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('nl-NL', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Incidenten</h1>
        {openCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
            <AlertTriangle className="h-3 w-3" />
            {openCount} open
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Zoeken..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="open_active">Open & In behandeling</SelectItem>
            <SelectItem value="all">Alle statussen</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_behandeling">In behandeling</SelectItem>
            <SelectItem value="afgehandeld">Afgehandeld</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle types</SelectItem>
            {uniqueTypes.map((t) => (
              <SelectItem key={t} value={t}>{typeLabel(t)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <p className="py-12 text-center text-muted-foreground">Laden...</p>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">Geen incidenten gevonden.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                <th className="px-3 py-2 text-left font-medium">Device</th>
                <th className="hidden px-3 py-2 text-left font-medium sm:table-cell">Type</th>
                <th className="px-3 py-2 text-left font-medium">Incident</th>
                <th className="hidden px-3 py-2 text-left font-medium md:table-cell">Incident type</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="hidden px-3 py-2 text-left font-medium sm:table-cell">Datum</th>
                <th className="w-10 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((incident) => (
                <tr key={incident.id} className="border-b last:border-b-0 hover:bg-muted/20">
                  <td className="px-3 py-2">
                    <p className="font-medium">{incident.hardware?.asset_id ?? '—'}</p>
                    <p className="text-xs text-muted-foreground sm:hidden">
                      {incident.hardware?.device_type} · {formatDate(incident.created_at)}
                    </p>
                  </td>
                  <td className="hidden px-3 py-2 text-muted-foreground sm:table-cell">
                    {incident.hardware?.device_type ?? '—'}
                  </td>
                  <td className="max-w-[200px] px-3 py-2">
                    <p className="truncate font-medium">{incident.title}</p>
                    {incident.involved && (
                      <p className="truncate text-xs text-muted-foreground">{incident.involved}</p>
                    )}
                  </td>
                  <td className="hidden px-3 py-2 md:table-cell">
                    {typeLabel(incident.action_type)}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(incident.status)}`}>
                      {statusLabel(incident.status)}
                    </span>
                  </td>
                  <td className="hidden px-3 py-2 text-muted-foreground sm:table-cell">
                    {formatDate(incident.created_at)}
                  </td>
                  <td className="px-3 py-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => navigate(`/hardware/${incident.hardware_id}`)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-sm text-muted-foreground">{filtered.length} incident(en)</p>
    </div>
  )
}
