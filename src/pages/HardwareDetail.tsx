import { useEffect, useState, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Plus, Pencil, Trash2, X, Check, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Hardware, HardwareAction } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

const DEVICE_STATUSES = ['active', 'in_repair', 'inactive', 'retired']
const ACTION_TYPES = ['storing', 'reparatie', 'melding', 'defect', 'overig']
const ACTION_STATUSES = ['open', 'in_behandeling', 'afgehandeld']

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

interface IncidentForm {
  title: string
  description: string
  incident_number: string
  action_type: string
  involved: string
  status: string
}

const emptyForm: IncidentForm = {
  title: '',
  description: '',
  incident_number: '',
  action_type: 'storing',
  involved: '',
  status: 'open',
}

function IncidentsSection({ hardwareId }: { hardwareId: string }) {
  const { user } = useAuth()
  const [actions, setActions] = useState<HardwareAction[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState<IncidentForm>({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<IncidentForm>({ ...emptyForm })

  const fetchActions = async () => {
    const { data } = await supabase
      .from('hardware_actions')
      .select('*')
      .eq('hardware_id', hardwareId)
      .order('created_at', { ascending: false })
    setActions(data ?? [])
    setLoading(false)
  }

  if (loading && actions.length === 0) {
    fetchActions()
  }

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault()
    if (!newForm.title.trim()) return
    setSaving(true)

    await supabase.from('hardware_actions').insert({
      hardware_id: hardwareId,
      user_id: user!.id,
      title: newForm.title.trim(),
      description: newForm.description || null,
      incident_number: newForm.incident_number || null,
      action_type: newForm.action_type,
      involved: newForm.involved || null,
      status: newForm.status,
    })

    setNewForm({ ...emptyForm })
    setShowNew(false)
    setSaving(false)
    fetchActions()
  }

  const startEdit = (a: HardwareAction) => {
    setEditingId(a.id)
    setExpandedId(a.id)
    setEditForm({
      title: a.title,
      description: a.description ?? '',
      incident_number: a.incident_number ?? '',
      action_type: a.action_type,
      involved: a.involved ?? '',
      status: a.status,
    })
  }

  const saveEdit = async () => {
    if (!editingId) return
    setSaving(true)

    await supabase
      .from('hardware_actions')
      .update({
        title: editForm.title.trim(),
        description: editForm.description || null,
        incident_number: editForm.incident_number || null,
        action_type: editForm.action_type,
        involved: editForm.involved || null,
        status: editForm.status,
      })
      .eq('id', editingId)

    setEditingId(null)
    setSaving(false)
    fetchActions()
  }

  const deleteAction = async (actionId: string) => {
    await supabase.from('hardware_actions').delete().eq('id', actionId)
    if (expandedId === actionId) setExpandedId(null)
    if (editingId === actionId) setEditingId(null)
    fetchActions()
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('nl-NL', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })

  const openCount = actions.filter((a) => a.status !== 'afgehandeld').length

  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Incidenten</CardTitle>
            {openCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                <AlertTriangle className="h-3 w-3" />
                {openCount} open
              </span>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowNew(!showNew)}>
            <Plus className="mr-1 h-4 w-4" /><span className="hidden sm:inline">{showNew ? 'Annuleren' : 'Nieuw incident'}</span><span className="sm:hidden">{showNew ? 'Annuleer' : 'Nieuw'}</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {showNew && (
          <div className="rounded-md border bg-muted/20 p-3">
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Titel *</Label>
                <Input
                  value={newForm.title}
                  onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
                  placeholder="Korte omschrijving"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Type</Label>
                  <Select value={newForm.action_type} onValueChange={(v) => setNewForm({ ...newForm, action_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ACTION_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{typeLabel(t)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Status</Label>
                  <Select value={newForm.status} onValueChange={(v) => setNewForm({ ...newForm, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ACTION_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Incidentnummer</Label>
                  <Input value={newForm.incident_number} onChange={(e) => setNewForm({ ...newForm, incident_number: e.target.value })} placeholder="Optioneel" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Betrokkene</Label>
                  <Input value={newForm.involved} onChange={(e) => setNewForm({ ...newForm, involved: e.target.value })} placeholder="Optioneel" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Omschrijving</Label>
                <textarea
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={newForm.description}
                  onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                  placeholder="Gedetailleerde omschrijving..."
                />
              </div>
              <Button type="submit" size="sm" disabled={saving || !newForm.title.trim()}>
                <Plus className="mr-1 h-4 w-4" />{saving ? 'Toevoegen...' : 'Toevoegen'}
              </Button>
            </form>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Laden...</p>
        ) : actions.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Geen incidenten geregistreerd.
          </p>
        ) : (
          <div className="overflow-hidden rounded-md border">
            {actions.map((action, i) => {
              const isExpanded = expandedId === action.id
              const isEditing = editingId === action.id

              return (
                <div key={action.id} className={i > 0 ? 'border-t' : ''}>
                  <button
                    type="button"
                    onClick={() => {
                      if (isEditing) return
                      setExpandedId(isExpanded ? null : action.id)
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/30"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <span className="min-w-0 flex-1 truncate font-medium">{action.title}</span>
                    <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(action.status)}`}>
                      {statusLabel(action.status)}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="border-t bg-muted/10 px-3 py-3">
                      {isEditing ? (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Titel</Label>
                            <Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
                          </div>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Type</Label>
                              <Select value={editForm.action_type} onValueChange={(v) => setEditForm({ ...editForm, action_type: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {ACTION_TYPES.map((t) => (
                                    <SelectItem key={t} value={t}>{typeLabel(t)}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Status</Label>
                              <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {ACTION_STATUSES.map((s) => (
                                    <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Incidentnummer</Label>
                              <Input value={editForm.incident_number} onChange={(e) => setEditForm({ ...editForm, incident_number: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Betrokkene</Label>
                              <Input value={editForm.involved} onChange={(e) => setEditForm({ ...editForm, involved: e.target.value })} />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Omschrijving</Label>
                            <textarea
                              className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              value={editForm.description}
                              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={saveEdit} disabled={saving}>
                              <Check className="mr-1 h-4 w-4" />{saving ? 'Opslaan...' : 'Opslaan'}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                              <X className="mr-1 h-4 w-4" />Annuleren
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground">Type</p>
                              <p>{typeLabel(action.action_type)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Status</p>
                              <p>{statusLabel(action.status)}</p>
                            </div>
                            {action.incident_number && (
                              <div>
                                <p className="text-xs text-muted-foreground">Incidentnummer</p>
                                <p>{action.incident_number}</p>
                              </div>
                            )}
                            {action.involved && (
                              <div>
                                <p className="text-xs text-muted-foreground">Betrokkene</p>
                                <p>{action.involved}</p>
                              </div>
                            )}
                          </div>

                          {action.description && (
                            <div>
                              <p className="text-xs text-muted-foreground">Omschrijving</p>
                              <p className="whitespace-pre-wrap text-sm">{action.description}</p>
                            </div>
                          )}

                          <p className="text-xs text-muted-foreground">
                            Aangemaakt: {formatDate(action.created_at)}
                            {action.updated_at !== action.created_at && ` · Bijgewerkt: ${formatDate(action.updated_at)}`}
                          </p>

                          <Separator />

                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => startEdit(action)}>
                              <Pencil className="mr-1 h-3.5 w-3.5" />Bewerken
                            </Button>
                            <Button size="sm" variant="outline" className="text-destructive" onClick={() => deleteAction(action.id)}>
                              <Trash2 className="mr-1 h-3.5 w-3.5" />Verwijderen
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DeviceEditForm({
  item,
  onUpdate,
  saving,
  onSubmit,
  error,
  success,
}: {
  item: Hardware
  onUpdate: (field: keyof Hardware, value: unknown) => void
  saving: boolean
  onSubmit: (e: FormEvent) => void
  error: string | null
  success: boolean
}) {
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="text-lg">
          {item.asset_id} bewerken
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="asset_id">Asset ID</Label>
              <Input id="asset_id" value={item.asset_id} onChange={(e) => onUpdate('asset_id', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serial">Serienummer(s)</Label>
              <Input id="serial" value={item.serial_numbers?.join(', ') ?? ''} onChange={(e) => onUpdate('serial_numbers', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Input id="type" value={item.device_type} onChange={(e) => onUpdate('device_type', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand">Merk</Label>
              <Input id="brand" value={item.brand ?? ''} onChange={(e) => onUpdate('brand', e.target.value || null)} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={item.device_status} onValueChange={(v) => onUpdate('device_status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEVICE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Locatie</Label>
              <Input id="location" value={item.location ?? ''} onChange={(e) => onUpdate('location', e.target.value || null)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchase_date">Aanschafdatum</Label>
              <Input id="purchase_date" type="date" value={item.purchase_date ?? ''} onChange={(e) => onUpdate('purchase_date', e.target.value || null)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="school_year">Schooljaar</Label>
              <Input id="school_year" value={item.school_year ?? ''} onChange={(e) => onUpdate('school_year', e.target.value || null)} placeholder="bijv. 2024-2025" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Prijs</Label>
              <Input id="price" type="number" step="0.01" value={item.price ?? ''} onChange={(e) => onUpdate('price', e.target.value ? parseFloat(e.target.value) : null)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notities</Label>
            <textarea
              id="notes"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={item.notes ?? ''}
              onChange={(e) => onUpdate('notes', e.target.value || null)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-green-600">Opgeslagen!</p>}

          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Opslaan...' : 'Opslaan'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default function HardwareDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [item, setItem] = useState<Hardware | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function fetch() {
      const { data, error } = await supabase
        .from('hardware')
        .select('*')
        .eq('id', id!)
        .single()

      if (error) {
        setError(error.message)
      } else {
        setItem(data)
      }
      setLoading(false)
    }
    fetch()
  }, [id])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!item) return

    setSaving(true)
    setError(null)
    setSuccess(false)

    const { error } = await supabase
      .from('hardware')
      .update({
        asset_id: item.asset_id,
        serial_numbers: item.serial_numbers,
        device_type: item.device_type,
        brand: item.brand,
        device_status: item.device_status,
        location: item.location,
        purchase_date: item.purchase_date,
        school_year: item.school_year,
        price: item.price,
        notes: item.notes,
      })
      .eq('id', item.id)

    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
    }
    setSaving(false)
  }

  const update = (field: keyof Hardware, value: unknown) => {
    setItem(prev => prev ? { ...prev, [field]: value } : prev)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (error && !item) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/hardware')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Terug
        </Button>
        <p className="text-destructive">Fout: {error}</p>
      </div>
    )
  }

  if (!item) return null

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate('/hardware')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Terug naar overzicht
      </Button>

      {/* Two-column layout: device left, incidents right */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DeviceEditForm
          item={item}
          onUpdate={update}
          saving={saving}
          onSubmit={handleSubmit}
          error={error}
          success={success}
        />
        <IncidentsSection hardwareId={item.id} />
      </div>
    </div>
  )
}
