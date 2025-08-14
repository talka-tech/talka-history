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

// TALKA_PRODUCTS = Produtos/Frentes da Talka
export interface TalkaProduct {
  id: string
  name: string
  description: string
  color: string
  logo_url?: string
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
  product_id: string // ID do produto Talka associado
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

// PRODUCT_ANALYTICS = Métricas por produto (opcional)
export interface ProductAnalytics {
  id: string
  product_id: string
  date: string
  total_clients: number
  active_clients: number
  credits_consumed: number
  revenue: number
  created_at: string
}

export interface MonthlyConsumption {
  day: string
  credits: number
  date: string
}

export interface ClientWithStats extends Client {
  monthlyConsumption: MonthlyConsumption[]
  product?: TalkaProduct // Incluir dados do produto
}
