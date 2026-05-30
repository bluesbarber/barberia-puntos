import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

const supabaseUrl = 'https://omnfznfdalhujrbpnxot.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tbmZ6bmZkYWxodWpyYnBueG90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMDE3NjcsImV4cCI6MjA5NTY3Nzc2N30.ksWfQxalAvGsH_-VMY6lCELLG_31tilib5YBRpzf22o'

export const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: {
    transport: ws
  }
})