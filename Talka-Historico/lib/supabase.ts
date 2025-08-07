import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Para APIs serverless (com service role key)
export const supabase = createClient(supabaseUrl, supabaseKey)

// Para client-side (com anon key)
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
