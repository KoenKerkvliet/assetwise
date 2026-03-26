import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Hardware } from '@/types/database'

export function useHardware() {
  const [data, setData] = useState<Hardware[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchHardware() {
      const { data, error } = await supabase
        .from('hardware')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        setError(error.message)
      } else {
        setData(data ?? [])
      }
      setLoading(false)
    }
    fetchHardware()
  }, [])

  return { data, loading, error }
}
