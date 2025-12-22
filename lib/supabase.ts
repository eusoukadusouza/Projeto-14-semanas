import { createClient } from '@supabase/supabase-js'

console.log('ENV URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('ENV KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
