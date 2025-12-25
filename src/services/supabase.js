import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
export const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50cW1zZGVvYXhhZ2F3d3lyc2diIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjE2MDMzMSwiZXhwIjoyMDgxNzM2MzMxfQ.UlxZKgMPtDfMy1Wnt3468QZCtqW3pNyvkTNcu8HgyFc' // Cole a chave que você copiou
);