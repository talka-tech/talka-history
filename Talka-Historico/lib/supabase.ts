import { createClient } from '@supabase/supabase-js'

// Debug: verificar se as variáveis estão sendo carregadas
console.log('🔍 Debug - import.meta.env:', import.meta.env)
console.log('🔍 Debug - VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL)
console.log('🔍 Debug - VITE_SUPABASE_ANON_KEY existe:', !!import.meta.env.VITE_SUPABASE_ANON_KEY)

// Variáveis de ambiente do Vite (.env)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validação
if (!supabaseUrl) {
  console.error('❌ VITE_SUPABASE_URL não encontrada no arquivo .env')
  console.error('❌ Todas as env vars:', Object.keys(import.meta.env))
  throw new Error('VITE_SUPABASE_URL is required in .env file')
}

if (!supabaseAnonKey) {
  console.error('❌ VITE_SUPABASE_ANON_KEY não encontrada no arquivo .env')
  throw new Error('VITE_SUPABASE_ANON_KEY is required in .env file')
}

// Cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Log de confirmação (apenas em desenvolvimento)
if (import.meta.env.DEV) {
  console.log('✅ Supabase configurado com sucesso via .env')
}
