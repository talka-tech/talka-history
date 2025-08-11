import { createClient } from '@supabase/supabase-js'

// Configuração das variáveis de ambiente com fallback para produção
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fyfdwfilsmvahztfgwml.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5ZmR3Zmlsc212YWh6dGZnd21sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1OTUxNjgsImV4cCI6MjA3MDE3MTE2OH0.FO02SDoaB5m4Ko_VtVwFmKEJWE17qxxLV5qp9AXioSE'

// Validação
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase configuration missing')
}

// Cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Log de confirmação (apenas em desenvolvimento)
if (import.meta.env.DEV) {
  console.log('✅ Supabase configurado com sucesso')
}
