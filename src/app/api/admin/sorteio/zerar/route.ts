import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST() {
  await supabaseAdmin.from('base_clientes_saipos').update({ tickets: 0 });
  return NextResponse.json({ ok: true });
}