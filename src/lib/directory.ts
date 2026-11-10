import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { Role } from './types'

export interface Person {
  id: string
  full_name: string
  specialty_id: number | null
  subspecialty_id: number | null
  residency_year: number | null
  role: Role
}

let cache: Promise<Person[]> | null = null

export function loadDirectory(force = false) {
  if (!cache || force) {
    cache = Promise.resolve(supabase.rpc('directory')).then(({ data }) => (data as Person[]) ?? [])
  }
  return cache
}

export function useDirectory() {
  const [people, setPeople] = useState<Person[]>([])
  useEffect(() => { loadDirectory().then(setPeople) }, [])
  return people
}
