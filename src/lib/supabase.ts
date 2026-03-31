import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sgqyyopquqxkvxasxnsj.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNncXl5b3BxdXF4a3Z4YXN4bnNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5Nzg3MjMsImV4cCI6MjA5MDU1NDcyM30.7cF2J4UhHXMhZ0j63nkLxwVNb8l3NIlb15ag3nMEl60'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
