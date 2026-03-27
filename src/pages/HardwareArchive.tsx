import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, RotateCcw, Trash2, CheckSquare, X, Pencil } from 'lucide-react'
import { useHardware, type HardwareWithIncidents } from '@/hooks/useHardware'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function HardwareArchive() {
  const { data, loading, error, refresh } = useHardware('archived')
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'restore' | 'delete' | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filtered = useMemo(() => {
    if (!search) return data
    const q = search.toLowerCase()
    return data.filter((h) =>
      h.asset_id.toLowerCase().includes(q) ||
      h.device_type.toLowerCase().includes(q) ||
      h.brand?.toLowerCase().includes(q) ||
      h.serial_numbers?.some((s) => s.toLowerCase().includes(q))
    )
  }, [data, search])

  const selectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map((h) => h.id)))
  }

  const exitSelectMode = () => {
    setSelectMode(false)
    setSelected(new Set())
    setConfirmAction(null)
  }

  const performAction = async (action: 'restore' | 'delete') => {
    if (selected.size === 0) return
    setActionLoading(true)
    const newStatus = action === 'restore' ? 'active' : 'deleted'
    await supabase.from('hardware').update({ status: newStatus }).in('id', [...selected])
    setActionLoading(false)
    exitSelectMode()
    refresh()
  }

  const fmt = (d: string) => new Date(d).toLocaleDateString('nl-NL')

  if (error) return <p className="text-destructive">Fout bij laden: {error}</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Archief</h1>
        <Button
          variant={selectMode ? 'secondary' : 'outline'}
          size="sm"
          onClick={selectMode ? exitSelectMode : () => setSelectMode(true)}
        >
          {selectMode ? <><X className="mr-1 h-4 w-4" /> Annuleren</> : <><CheckSquare className="mr-1 h-4 w-4" /> Selecteren</>}
        </Button>
      </div>

      {selectMode && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
          <Button variant="outline" size="sm" onClick={selectAll}>
            {selected.size === filtered.length ? 'Deselecteer alles' : 'Selecteer alles'}
          </Button>
          <span className="text-sm text-muted-foreground">{selected.size} geselecteerd</span>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" disabled={selected.size === 0} onClick={() => setConfirmAction('restore')}>
              <RotateCcw className="mr-1 h-4 w-4" /> Herstellen
            </Button>
            <Button variant="destructive" size="sm" disabled={selected.size === 0} onClick={() => setConfirmAction('delete')}>
              <Trash2 className="mr-1 h-4 w-4" /> Naar prullenbak
            </Button>
          </div>
        </div>
      )}

      {confirmAction && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium">
            Weet je zeker dat je {selected.size} item(s) wilt {confirmAction === 'restore' ? 'herstellen' : 'naar de prullenbak verplaatsen'}?
          </p>
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              variant={confirmAction === 'delete' ? 'destructive' : 'default'}
              disabled={actionLoading}
              onClick={() => performAction(confirmAction)}
            >
              {actionLoading ? 'Bezig...' : confirmAction === 'restore' ? 'Ja, herstellen' : 'Ja, verplaatsen'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setConfirmAction(null)}>Annuleren</Button>
          </div>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Zoeken..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <p className="py-12 text-center text-muted-foreground">Laden...</p>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">Geen gearchiveerde items.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                {selectMode && <th className="w-8 px-3 py-2" />}
                <th className="px-3 py-2 text-left font-medium">Asset ID</th>
                <th className="hidden px-3 py-2 text-left font-medium sm:table-cell">Type</th>
                <th className="hidden px-3 py-2 text-left font-medium md:table-cell">Merk</th>
                <th className="hidden px-3 py-2 text-left font-medium md:table-cell">Serienummer</th>
                <th className="hidden px-3 py-2 text-left font-medium sm:table-cell">Locatie</th>
                <th className="w-10 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <TableRow
                  key={item.id}
                  item={item}
                  selectMode={selectMode}
                  selected={selected.has(item.id)}
                  onToggle={toggleSelect}
                  onEdit={() => navigate(`/hardware/${item.id}`)}
                  fmt={fmt}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-sm text-muted-foreground">{filtered.length} item(s)</p>
    </div>
  )
}

interface TableRowProps {
  item: HardwareWithIncidents
  selectMode: boolean
  selected: boolean
  onToggle: (id: string) => void
  onEdit: () => void
  fmt: (d: string) => string
}

function TableRow({ item, selectMode, selected, onToggle, onEdit }: TableRowProps) {
  return (
    <tr
      className={cn('border-b last:border-b-0 hover:bg-muted/20', selectMode && 'cursor-pointer', selected && 'bg-primary/5')}
      onClick={selectMode ? () => onToggle(item.id) : undefined}
    >
      {selectMode && (
        <td className="px-3 py-2">
          <span className={cn(
            'flex h-4 w-4 items-center justify-center rounded border',
            selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40'
          )}>
            {selected && <CheckSquare className="h-3 w-3" />}
          </span>
        </td>
      )}
      <td className="px-3 py-2 font-medium">{item.asset_id}</td>
      <td className="hidden px-3 py-2 text-muted-foreground sm:table-cell">{item.device_type}</td>
      <td className="hidden px-3 py-2 text-muted-foreground md:table-cell">{item.brand ?? '—'}</td>
      <td className="hidden px-3 py-2 text-muted-foreground md:table-cell">{item.serial_numbers?.join(', ') ?? '—'}</td>
      <td className="hidden px-3 py-2 text-muted-foreground sm:table-cell">{item.location ?? '—'}</td>
      <td className="px-3 py-2">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onEdit() }}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </td>
    </tr>
  )
}
