import { createClient } from 'https://esm.sh/@supabase/supabase-js'

const supabaseUrl = "TU_URL"
const supabaseKey = "TU_API_KEY"

export const supabase = createClient(supabaseUrl, supabaseKey)