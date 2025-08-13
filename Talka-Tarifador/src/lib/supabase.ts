import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Types para TypeScript

// USERS = Administradores do sistema
export interface User {
  id: number
  email: string
  name: string
  role: 'admin' | 'super_admin' | 'client'
  password_hash: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// CLIENTS = Clientes criados pelos admins (fazem login no dashboard normal)
export interface Client {
  id: number
  name: string // Nome da empresa
  login: string // Login único do cliente
  password: string // Senha do cliente (visível para o admin)
  type: 'projeto' | 'individual'
  credits_total: number
  credits_used: number
  credits_remaining: number
  is_active: boolean
  created_by: number // ID do admin que criou
  last_usage: string | null
  created_at: string
  updated_at: string
}

// USAGE_HISTORY = Histórico de uso dos clientes
export interface UsageHistory {
  id: number
  client_id: number
  credits_consumed: number
  description: string | null
  usage_date: string
  created_at: string
}

export interface MonthlyConsumption {
  day: string
  credits: number
  date: string
}

export interface ClientWithStats extends Client {
  monthlyConsumption: MonthlyConsumption[]
}
