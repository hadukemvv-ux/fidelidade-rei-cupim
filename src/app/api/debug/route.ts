    import { NextResponse } from 'next/server';
    import { supabaseAdmin } from '@/lib/supabaseAdmin';

    export async function GET() {
      try {
        const { data, error } = await supabaseAdmin
          .from('resgates')
          .select('*')
          .limit(5);

        return NextResponse.json({ 
          status: 'Debug', 
          dados: data, 
          erro: error 
        });
      } catch (e: any) {
        return NextResponse.json({ erro: e.message });
      }
    }