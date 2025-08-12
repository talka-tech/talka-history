// api/total-conversations.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
    if (request.method !== 'GET') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
            status: 405, headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const url = new URL(request.url);
        const userId = url.searchParams.get('userId');

        if (!userId) {
            return new Response(JSON.stringify({ error: 'User ID is required' }), {
                status: 400, headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log(`📊 COUNT(*): Contando TODAS as conversas do usuário ${userId}...`);
        
        // COUNT(*) - Conta TODAS as conversas sem LIMIT
        const { count, error } = await supabase
            .from('conversations')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', parseInt(userId));
            
        if (error) {
            console.error('❌ Erro no COUNT(*):', error);
            throw error;
        }

        const total = count || 0;
        console.log(`✅ COUNT(*) resultado: ${total} conversas totais para usuário ${userId}`);

        return new Response(JSON.stringify({ total }), {
            status: 200, headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error('❌ Erro na API de total:', error);
        return new Response(JSON.stringify({ error: "Failed to count conversations", details: error.message }), {
            status: 500, headers: { 'Content-Type': 'application/json' }
        });
    }
}
