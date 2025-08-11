// Teste para verificar se as variáveis de ambiente estão sendo carregadas
console.log('🔍 Testando variáveis de ambiente:')
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL)
console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Definida' : 'Undefined')
console.log('Todas as env vars:', import.meta.env)

export {};
