import { createClient } from '@supabase/supabase-js'

// Baked-in defaults so no build-time env vars are required on Cloudflare.
// Both values are public by design (publishable key); data isolation relies on
// the shared workspace id + application-level filtering.
const FALLBACK_URL = 'https://xjihmrcwumxxibomvgvt.supabase.co'
const FALLBACK_KEY = 'sb_publishable_RFW1eCJZnYYFcqIjW65_ww_Pp60MujI'

const url = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_KEY

export const supabase = createClient(url, key)
export const isSupabaseConfigured = true

export const TABLES = ['concepts', 'study_logs', 'resources', 'project_ideas', 'reviews']
