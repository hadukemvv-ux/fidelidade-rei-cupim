import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // devolve as variáveis que o servidor tem (não expõe a chave service_role ao cliente)
  res.status(200).json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || null,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || null,
    // NÃO enviamos a service_role aqui (é segredo) – só para confirmar que o arquivo existe
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}
