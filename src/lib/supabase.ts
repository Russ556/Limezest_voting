import { createClient } from '@supabase/supabase-js'

const fallbackSupabaseUrl = 'https://goncvqreojkdczwammnu.supabase.co'
const fallbackSupabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbmN2cXJlb2prZGN6d2FtbW51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNDU5NDQsImV4cCI6MjA5NjgyMTk0NH0.rjH5mYro5Dv12LSPN5RoJG-ChxVK1HUCZ7zs6EjAU20'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || fallbackSupabaseUrl
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || fallbackSupabaseAnonKey

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('Supabase environment variables are missing. Falling back to the public anon key bundled for this MVP.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
