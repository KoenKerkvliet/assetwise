import { useMemo, useState } from 'react'
import { Search, RotateCcw, Trash2, CheckSquare, X, AlertTriangle } from 'lucide-react'
import { useHardware } from '@/hooks/useHardware'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function HardwareDeleted() {
  const { data, loading, error, refresh } = useHardware('deleted')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'restore' | 'permanent' | null>(null)
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

  const performAction = async (action: 'restore' | 'permanent') => {
    if (selected.size === 0) return
    setActionLoading(true)
    const ids = [...selected]

    if (action === 'restore') {
      await supabase.from('hardware').update({ status: 'active' }).in('id', ids)
    } else {
      // Permanent delete: first remove related records, then the hardware
      await supabase.from('hardware_actions').delete().in('hardware_id', ids)
      await supabase.from('hardware').delete().in('id', ids)
    }

    setActionLoading(false)
    exitSelectMode()
    refresh()
  }

  if (error) return <p className="text-destructive">Fout bij laden: {error}</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Prullenbak</h1>
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
            <Button variant="destructive" size="sm" disabled={selected.size === 0} onClick={() => setConfirmAction('permanent')}>
              <Trash2 className="mr-1 h-4 w-4" /> Definitief verwijderen
            </Button>
          </div>
        </div>
      )}

      {confirmAction && (
        <div className={cn(
          'rounded-md border px-4 py-3',
          confirmAction === 'permanent' ? 'border-red-300 bg-red-50' : 'border-amber-300 bg-amber-50'
        )}>
          {confirmAction === 'permanent' && (
            <div className="mb-2 flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-semibold">Let op: dit kan niet ongedaan gemaakt worden!</span>
            </div>
          )}
          <p className="text-sm font-medium">
            Weet je zeker dat je {selected.size} item(s) {confirmAction === 'restore' ? 'wilt herstellen' : 'definitief wilt verwijderen'}?
          </p>
          {confirmAction === 'permanent' && (
            <p className="text-xs text-muted-foreground">
              Alle gegevens en bijbehorende incidenten worden permanent verwijderd.
            </p>
          )}
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              variant={confirmAction === 'permanent' ? 'destructive' : 'default'}
              disabled={actionLoading}
              onClick={() => performAction(confirmAction)}
            >
              {actionLoading ? 'Bezig...' : confirmAction === 'restore' ? 'Ja, herstellen' : 'Ja, definitief verwijderen'}
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
        <p className="py-12 text-center text-muted-foreground">Prullenbak is leeg.</p>
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
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  className={cn(
                    'border-b last:border-b-0 hover:bg-muted/20',
                    selectMode && 'cursor-pointer',
                    selected.has(item.id) && 'bg-primary/5'
                  )}
                  onClick={selectMode ? () => toggleSelect(item.id) : undefined}
                >
                  {selectMode && (
                    <td className="px-3 py-2">
                      <span className={cn(
                        'flex h-4 w-4 items-center justify-center rounded border',
                        selected.has(item.id) ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40'
                      )}>
                        {selected.has(item.id) && <CheckSquare className="h-3 w-3" />}
                      </span>
                    </td>
                  )}
                  <td className="px-3 py-2 font-medium">{item.asset_id}</td>
                  <td className="hidden px-3 py-2 text-muted-foreground sm:table-cell">{item.device_type}</td>
                  <td className="hidden px-3 py-2 text-muted-foreground md:table-cell">{item.brand ?? '—'}</td>
                  <td className="hidden px-3 py-2 text-muted-foreground md:table-cell">{item.serial_numbers?.join(', ') ?? '—'}</td>
                  <td className="hidden px-3 py-2 text-muted-foreground sm:table-cell">{item.location ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-sm text-muted-foreground">{filtered.length} item(s)</p>
    </div>
  )
}
