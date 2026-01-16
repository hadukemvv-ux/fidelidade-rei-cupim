import { createClient } from '@supabase/supabase-js';

// URL do seu projeto Supabase (mesmo que está no .env.local)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// Chave de serviço – tem permissão total (NUNCA exposta ao cliente)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Cliente usado apenas nas rotas API (executado no servidor)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
