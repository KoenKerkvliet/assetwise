import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Hardware, HardwareType } from '@/types/database'

export interface HardwareWithIncidents extends Hardware {
  /** The most severe open incident type: 'reparatie'|'defect' → red, 'storing'|'melding' → orange, null → green */
  worstOpenIncidentType: string | null
  /** Current residual value based on linear depreciation */
  residualValue: number | null
}

/**
 * Calculate residual value using linear depreciation.
 * Value goes from purchase price to 0 over the depreciation period.
 */
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
  const elapsedMs = now.getTime() - purchase.getTime()
  const elapsedMonths = elapsedMs / (1000 * 60 * 60 * 24 * 30.4375) // avg days per month

  if (elapsedMonths <= 0) return priceNum
  if (elapsedMonths >= depreciationMonths) return 0

  const fraction = 1 - elapsedMonths / depreciationMonths
  return Math.round(priceNum * fraction * 100) / 100
}

export function useHardware() {
  const [data, setData] = useState<HardwareWithIncidents[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchHardware() {
      const [hwRes, actionsRes, typesRes] = await Promise.all([
        supabase.from('hardware').select('*').order('created_at', { ascending: false }),
        supabase.from('hardware_actions').select('hardware_id, action_type, status'),
        supabase.from('hardware_types').select('type, depreciation_period'),
      ])

      if (hwRes.error) {
        setError(hwRes.error.message)
        setLoading(false)
        return
      }

      // Build map: device_type → depreciation_period (months)
      const depMap = new Map<string, number>()
      for (const t of (typesRes.data ?? []) as HardwareType[]) {
        depMap.set(t.type, t.depreciation_period)
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
        residualValue: calcResidualValue(
          hw.price,
          hw.purchase_date,
          depMap.get(hw.device_type) ?? null
        ),
      }))

      setData(enriched)
      setLoading(false)
    }
    fetchHardware()
  }, [])

  return { data, loading, error }
}
