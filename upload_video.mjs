import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import ws from 'ws'

const sb = createClient(
  'https://iqeiszkoifxgygoqvbem.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZWlzemtvaWZ4Z3lnb3F2YmVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMTEzODIsImV4cCI6MjA5NDc4NzM4Mn0.qxt70TPbARPcMc8HhHx2A2QnfBvJLCrnrH4m36IcENs',
  { realtime: { transport: ws } }
)

const file = readFileSync('GuiaRegistro.mp4')
const { error } = await sb.storage.from('trabajos').upload('videos/GuiaRegistro.mp4', file, {
  contentType: 'video/mp4',
  upsert: true
})
if(error){ console.log('ERROR:', error.message); process.exit(1) }
const { data } = sb.storage.from('trabajos').getPublicUrl('videos/GuiaRegistro.mp4')
console.log('URL:', data.publicUrl)
