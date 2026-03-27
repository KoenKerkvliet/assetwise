import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Hardware } from '@/types/database'

export interface HardwareWithIncidents extends Hardware {
  /** The most severe open incident type: 'reparatie'|'defect' → red, 'storing'|'melding' → orange, null → green */
  worstOpenIncidentType: string | null
}

export function useHardware() {
  const [data, setData] = useState<HardwareWithIncidents[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchHardware() {
      const [hwRes, actionsRes] = await Promise.all([
        supabase.from('hardware').select('*').order('created_at', { ascending: false }),
        supabase.from('hardware_actions').select('hardware_id, action_type, status'),
      ])

      if (hwRes.error) {
        setError(hwRes.error.message)
        setLoading(false)
        return
      }

      // Build map: hardware_id → worst open incident type
      const incidentMap = new Map<string, string>()
      const RED_TYPES = new Set(['reparatie', 'defect'])

      for (const action of actionsRes.data ?? []) {
        if (action.status === 'afgehandeld') continue

        const current = incidentMap.get(action.hardware_id)
        // Red types take priority over orange types
        if (RED_TYPES.has(action.action_type)) {
          incidentMap.set(action.hardware_id, action.action_type)
        } else if (!current || !RED_TYPES.has(current)) {
          incidentMap.set(action.hardware_id, action.action_type)
        }
      }

      const enriched: HardwareWithIncidents[] = (hwRes.data ?? []).map((hw) => ({
        ...hw,
        worstOpenIncidentType: incidentMap.get(hw.id) ?? null,
      }))

      setData(enriched)
      setLoading(false)
    }
    fetchHardware()
  }, [])

  return { data, loading, error }
}
