    import { NextResponse } from 'next/server';
    import { supabaseAdmin } from '@/lib/supabaseAdmin';
    import { validateAdminAuth } from '@/app/api/_utils/validateAdminAuth';

    export async function GET(request: Request) {
      const authError = await validateAdminAuth(request, new URL(request.url));
      if (authError) return authError;
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
