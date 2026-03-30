import { useEffect, useState, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Plus, Pencil, Trash2, X, Check, ChevronDown, ChevronRight, AlertTriangle, FileText, Download } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Hardware, HardwareAction, FollowUp, Invoice, HardwareType } from '@/types/database'
import { exportInvoicePdf } from '@/lib/exportInvoicePdf'
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

const DEVICE_STATUSES = ['active', 'impaired', 'in_repair', 'inactive', 'retired']
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

const INCIDENT_TO_DEVICE_STATUS: Record<string, string> = {
  defect: 'retired',
  reparatie: 'in_repair',
  storing: 'impaired',
}

const DEVICE_STATUS_LABELS: Record<string, string> = {
  active: 'Actief',
  impaired: 'Beperkt inzetbaar',
  in_repair: 'In reparatie',
  inactive: 'Inactief',
  retired: 'Buiten gebruik',
}

async function suggestDeviceStatusChange(
  hardwareId: string,
  actionType: string,
  actionStatus: string,
  currentDeviceStatus: string,
  onStatusChanged: (newStatus: string) => void,
) {
  let suggestedStatus: string | undefined

  if (actionStatus === 'afgehandeld') {
    if (currentDeviceStatus !== 'active') {
      suggestedStatus = 'active'
    }
  } else {
    suggestedStatus = INCIDENT_TO_DEVICE_STATUS[actionType]
  }

  if (!suggestedStatus || suggestedStatus === currentDeviceStatus) return

  const label = DEVICE_STATUS_LABELS[suggestedStatus] ?? suggestedStatus
  const confirmed = window.confirm(
    `Wil je de device status wijzigen naar "${label}"?`
  )
  if (!confirmed) return

  const { error } = await supabase
    .from('hardware')
    .update({ device_status: suggestedStatus })
    .eq('id', hardwareId)

  if (error) {
    alert('Kon device status niet bijwerken: ' + error.message)
  } else {
    onStatusChanged(suggestedStatus)
  }
}

function IncidentsSection({ hardwareId, currentDeviceStatus, onDeviceStatusChanged }: { hardwareId: string; currentDeviceStatus: string; onDeviceStatusChanged: (status: string) => void }) {
  const { user } = useAuth()
  const [actions, setActions] = useState<HardwareAction[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState<IncidentForm>({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<IncidentForm>({ ...emptyForm })
  const [showFollowUpForm, setShowFollowUpForm] = useState<string | null>(null)
  const [followUpNote, setFollowUpNote] = useState('')
  const [editingFollowUpId, setEditingFollowUpId] = useState<string | null>(null)
  const [editingFollowUpNote, setEditingFollowUpNote] = useState('')

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

    const { error } = await supabase.from('hardware_actions').insert({
      hardware_id: hardwareId,
      user_id: user!.id,
      title: newForm.title.trim(),
      description: newForm.description || null,
      incident_number: newForm.incident_number || null,
      action_type: newForm.action_type,
      involved: newForm.involved || null,
      status: newForm.status,
    })

    if (error) {
      console.error('Insert failed:', error)
      alert('Kon incident niet opslaan: ' + error.message)
      setSaving(false)
      return
    }

    setNewForm({ ...emptyForm })
    setShowNew(false)
    setSaving(false)
    await fetchActions()
    await suggestDeviceStatusChange(hardwareId, newForm.action_type, newForm.status, currentDeviceStatus, onDeviceStatusChanged)
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

    const { error } = await supabase
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

    if (error) {
      console.error('Update failed:', error)
      alert('Kon incident niet bijwerken: ' + error.message)
      setSaving(false)
      return
    }

    setEditingId(null)
    setSaving(false)
    await fetchActions()
    await suggestDeviceStatusChange(hardwareId, editForm.action_type, editForm.status, currentDeviceStatus, onDeviceStatusChanged)
  }

  const deleteAction = async (actionId: string) => {
    const { error } = await supabase.from('hardware_actions').delete().eq('id', actionId)
    if (error) {
      console.error('Delete failed:', error)
      alert('Kon incident niet verwijderen: ' + error.message)
      return
    }
    if (expandedId === actionId) setExpandedId(null)
    if (editingId === actionId) setEditingId(null)
    await fetchActions()
  }

  const addFollowUp = async (actionId: string) => {
    if (!followUpNote.trim()) return
    const action = actions.find((a) => a.id === actionId)
    if (!action) return
    const existing: FollowUp[] = (action.follow_ups as FollowUp[]) ?? []
    const newFollowUp: FollowUp = {
      id: crypto.randomUUID(),
      note: followUpNote.trim(),
      created_at: new Date().toISOString(),
    }
    const updated = [...existing, newFollowUp]
    const { error } = await supabase.from('hardware_actions').update({ follow_ups: updated }).eq('id', actionId)
    if (error) {
      console.error('Follow-up failed:', error)
      alert('Kon follow-up niet toevoegen: ' + error.message)
      return
    }
    setFollowUpNote('')
    setShowFollowUpForm(null)
    await fetchActions()
  }

  const saveFollowUp = async (actionId: string, followUpId: string) => {
    if (!editingFollowUpNote.trim()) return
    const action = actions.find((a) => a.id === actionId)
    if (!action) return
    const existing: FollowUp[] = (action.follow_ups as FollowUp[]) ?? []
    const updated = existing.map((f) =>
      f.id === followUpId ? { ...f, note: editingFollowUpNote.trim() } : f
    )
    const { error } = await supabase.from('hardware_actions').update({ follow_ups: updated }).eq('id', actionId)
    if (error) {
      console.error('Follow-up update failed:', error)
      alert('Kon follow-up niet bijwerken: ' + error.message)
      return
    }
    setEditingFollowUpId(null)
    setEditingFollowUpNote('')
    await fetchActions()
  }

  const deleteFollowUp = async (actionId: string, followUpId: string) => {
    const action = actions.find((a) => a.id === actionId)
    if (!action) return
    const existing: FollowUp[] = (action.follow_ups as FollowUp[]) ?? []
    const updated = existing.filter((f) => f.id !== followUpId)
    const { error } = await supabase.from('hardware_actions').update({ follow_ups: updated.length > 0 ? updated : null }).eq('id', actionId)
    if (error) {
      console.error('Follow-up delete failed:', error)
      alert('Kon follow-up niet verwijderen: ' + error.message)
      return
    }
    await fetchActions()
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

                          {/* Follow-ups */}
                          {(() => {
                            const followUps: FollowUp[] = (action.follow_ups as FollowUp[]) ?? []
                            return (
                              <>
                                {followUps.length > 0 && (
                                  <div className="space-y-2">
                                    <p className="text-xs font-medium text-muted-foreground">Follow-ups</p>
                                    <div className="space-y-2">
                                      {followUps.map((fu) => (
                                        <div key={fu.id} className="rounded border bg-background p-2">
                                          {editingFollowUpId === fu.id ? (
                                            <div className="space-y-2">
                                              <textarea
                                                className="flex min-h-[40px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                value={editingFollowUpNote}
                                                onChange={(e) => setEditingFollowUpNote(e.target.value)}
                                              />
                                              <div className="flex gap-2">
                                                <Button size="sm" onClick={() => saveFollowUp(action.id, fu.id)} disabled={!editingFollowUpNote.trim()}>
                                                  <Check className="mr-1 h-3.5 w-3.5" />Opslaan
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => setEditingFollowUpId(null)}>
                                                  <X className="mr-1 h-3.5 w-3.5" />Annuleren
                                                </Button>
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="flex items-start justify-between gap-2">
                                              <div className="min-w-0 flex-1">
                                                <p className="whitespace-pre-wrap text-sm">{fu.note}</p>
                                                <p className="mt-1 text-xs text-muted-foreground">{formatDate(fu.created_at)}</p>
                                              </div>
                                              <div className="flex shrink-0 gap-1">
                                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingFollowUpId(fu.id); setEditingFollowUpNote(fu.note) }}>
                                                  <Pencil className="h-3 w-3" />
                                                </Button>
                                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteFollowUp(action.id, fu.id)}>
                                                  <Trash2 className="h-3 w-3" />
                                                </Button>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {showFollowUpForm === action.id ? (
                                  <div className="space-y-2">
                                    <textarea
                                      className="flex min-h-[40px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                      value={followUpNote}
                                      onChange={(e) => setFollowUpNote(e.target.value)}
                                      placeholder="Follow-up notitie..."
                                    />
                                    <div className="flex gap-2">
                                      <Button size="sm" onClick={() => addFollowUp(action.id)} disabled={!followUpNote.trim()}>
                                        <Plus className="mr-1 h-3.5 w-3.5" />Toevoegen
                                      </Button>
                                      <Button size="sm" variant="ghost" onClick={() => { setShowFollowUpForm(null); setFollowUpNote('') }}>
                                        <X className="mr-1 h-3.5 w-3.5" />Annuleren
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <Button size="sm" variant="outline" onClick={() => setShowFollowUpForm(action.id)}>
                                    <Plus className="mr-1 h-3.5 w-3.5" />Follow-up toevoegen
                                  </Button>
                                )}
                              </>
                            )
                          })()}

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

const fmt = (v: number) =>
  new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(v)

function calcResidualValue(
  price: number | null,
  purchaseDate: string | null,
  depreciationMonths: number | null
): number | null {
  if (price == null || !purchaseDate || !depreciationMonths || depreciationMonths <= 0) return null
  const priceNum = Number(price)
  if (isNaN(priceNum) || priceNum <= 0) return null
  const purchase = new Date(purchaseDate)
  const now = new Date()
  const elapsedMonths = (now.getTime() - purchase.getTime()) / (1000 * 60 * 60 * 24 * 30.4375)
  if (elapsedMonths <= 0) return priceNum
  if (elapsedMonths >= depreciationMonths) return 0
  return Math.round(priceNum * (1 - elapsedMonths / depreciationMonths) * 100) / 100
}

function generateInvoiceNumber(existingInvoices: Invoice[]) {
  const year = new Date().getFullYear()
  const yearInvoices = existingInvoices.filter(i =>
    i.invoice_number?.startsWith(`RK-${year}`)
  )
  const nextNum = yearInvoices.length + 1
  return `RK-${year}-${String(nextNum).padStart(3, '0')}`
}

function InvoiceSection({ item }: { item: Hardware }) {
  const { user } = useAuth()
  const [showDialog, setShowDialog] = useState(false)
  const [saving, setSaving] = useState(false)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [depMonths, setDepMonths] = useState<number | null>(null)
  const [recipientName, setRecipientName] = useState('')
  const [profileData, setProfileData] = useState<{
    school_name: string; address: string; postal_code: string;
    city: string; account_number: string; kvk_number: string;
  } | null>(null)

  useEffect(() => {
    async function load() {
      const [profileRes, typesRes, invoicesRes] = await Promise.all([
        supabase.from('profiles').select('school_name, address, postal_code, city, account_number, kvk_number').eq('user_id', user!.id).single(),
        supabase.from('hardware_types').select('type, depreciation_period'),
        supabase.from('invoices').select('*').eq('hardware_id', item.id).order('created_at', { ascending: false }),
      ])

      const typeData = (typesRes.data ?? []) as HardwareType[]
      const match = typeData.find(t => t.type === item.device_type)
      setDepMonths(match?.depreciation_period ?? null)

      if (invoicesRes.data) setInvoices(invoicesRes.data)

      if (profileRes.data) {
        setProfileData({
          school_name: profileRes.data.school_name ?? '',
          address: profileRes.data.address ?? '',
          postal_code: profileRes.data.postal_code ?? '',
          city: profileRes.data.city ?? '',
          account_number: profileRes.data.account_number ?? '',
          kvk_number: profileRes.data.kvk_number ?? '',
        })
      }
    }
    load()
  }, [item.id, user])

  const residual = calcResidualValue(item.price, item.purchase_date, depMonths)

  const handleSave = async () => {
    if (!recipientName.trim()) {
      alert('Vul de naam van de ontvanger in.')
      return
    }
    if (residual == null) {
      alert('Restwaarde kan niet berekend worden. Controleer de aanschafprijs, aanschafdatum en afschrijvingsperiode.')
      return
    }

    const invoiceNumber = generateInvoiceNumber(invoices)
    const description = `Verrekening schade ${item.device_type} (${item.asset_id}). Aanschafwaarde: ${fmt(Number(item.price))}. Restwaarde na afschrijving: ${fmt(residual)}.`

    setSaving(true)
    const { data, error } = await supabase.from('invoices').insert({
      hardware_id: item.id,
      user_id: user!.id,
      invoice_number: invoiceNumber,
      school_name: profileData?.school_name || null,
      school_address: profileData?.address || null,
      school_postal_code: profileData?.postal_code || null,
      school_city: profileData?.city || null,
      school_iban: profileData?.account_number || null,
      school_kvk: profileData?.kvk_number || null,
      parent_name: recipientName.trim(),
      total_amount: residual,
      description,
    }).select().single()

    if (error) {
      alert('Kon rekening niet opslaan: ' + error.message)
    } else if (data) {
      setInvoices(prev => [data, ...prev])
      setShowDialog(false)
      setRecipientName('')
    }
    setSaving(false)
  }

  const handleDownloadPdf = (invoice: Invoice) => {
    exportInvoicePdf(invoice, item)
  }

  const deleteInvoice = async (id: string) => {
    if (!window.confirm('Weet je zeker dat je deze rekening wilt verwijderen?')) return
    const { error } = await supabase.from('invoices').delete().eq('id', id)
    if (error) {
      alert('Kon rekening niet verwijderen: ' + error.message)
    } else {
      setInvoices(prev => prev.filter(i => i.id !== id))
    }
  }

  const residual = calcResidualValue(item.price, item.purchase_date, depMonths)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Rekeningen</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setShowDialog(true)}>
          <FileText className="mr-2 h-4 w-4" /> Rekening maken
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {residual != null && (
          <p className="text-xs text-muted-foreground">
            Restwaarde: <span className="font-medium text-foreground">{fmt(residual)}</span>
            {item.price != null && <> (aanschaf: {fmt(Number(item.price))})</>}
          </p>
        )}

        {invoices.length === 0 && !showDialog && (
          <p className="py-4 text-center text-sm text-muted-foreground">Geen rekeningen aangemaakt.</p>
        )}

        {invoices.map(inv => (
          <div key={inv.id} className="rounded-md border p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">{inv.parent_name}</span>
              <span className="font-medium">{fmt(inv.total_amount)}</span>
            </div>
            {inv.description && <p className="mt-1 text-xs text-muted-foreground">{inv.description}</p>}
            <div className="mt-2 flex items-center gap-2">
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleDownloadPdf(inv)}>
                <Download className="mr-1 h-3 w-3" /> PDF
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => deleteInvoice(inv.id)}>
                <Trash2 className="mr-1 h-3 w-3" /> Verwijderen
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Aangemaakt: {new Date(inv.created_at).toLocaleDateString('nl-NL')}
            </p>
          </div>
        ))}

        {showDialog && (
          <div className="space-y-3 rounded-md border bg-muted/20 p-4">
            <h4 className="text-sm font-semibold">Nieuwe rekening</h4>

            {profileData && (
              <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
                <p className="mb-1 font-medium text-foreground">Afzender</p>
                <p>{profileData.school_name || <span className="italic">Geen schoolnaam ingesteld</span>}</p>
                {profileData.address && <p>{profileData.address}</p>}
                {(profileData.postal_code || profileData.city) && (
                  <p>{profileData.postal_code} {profileData.city}</p>
                )}
                {profileData.account_number && <p>IBAN: {profileData.account_number}</p>}
                {profileData.kvk_number && <p>KvK: {profileData.kvk_number}</p>}
                {!profileData.school_name && (
                  <p className="mt-1 text-amber-600">Stel je factuurgegevens in via Instellingen → Factuurgegevens</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <div className="space-y-1">
                <Label className="text-xs">Naam ouder/verzorger *</Label>
                <Input className="h-8 text-xs" value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="Naam van de ontvanger" />
              </div>
            </div>

            <div className="rounded-md bg-muted/40 p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Te betalen (restwaarde):</span>
                <span className="font-semibold">{residual != null ? fmt(residual) : 'Niet beschikbaar'}</span>
              </div>
              {item.price != null && residual != null && (
                <p className="mt-1 text-muted-foreground">
                  Aanschafprijs {fmt(Number(item.price))} minus afschrijving
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving || residual == null}>
                {saving ? 'Opslaan...' : 'Opslaan & rekening aanmaken'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowDialog(false)}>Annuleren</Button>
            </div>
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
        <div className="space-y-4">
          <IncidentsSection
            hardwareId={item.id}
            currentDeviceStatus={item.device_status}
            onDeviceStatusChanged={(status) => update('device_status', status)}
          />
          <InvoiceSection item={item} />
        </div>
      </div>
    </div>
  )
}
