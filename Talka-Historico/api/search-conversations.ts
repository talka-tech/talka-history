// api/search-conversations.ts
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
        const searchTerm = url.searchParams.get('q');

        if (!userId || !searchTerm) {
            return new Response(JSON.stringify({ error: 'User ID and search term are required' }), {
                status: 400, headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log(`🔍 BUSCA DIRETA: userId=${userId}, termo="${searchTerm}"`);
        
        // BUSCA DIRETA: Procura em TODAS as conversas do usuário
        const { data: conversations, error: convError } = await supabase
            .from('conversations')
            .select('id, title, user_id, created_at')
            .eq('user_id', parseInt(userId))
            .ilike('title', `%${searchTerm}%`) // Busca case-insensitive no título
            .order('created_at', { ascending: false })
            .limit(100); // Limita a 100 resultados da busca
            
        if (convError) {
            console.error('❌ Erro na busca:', convError);
            throw convError;
        }

        if (!conversations || conversations.length === 0) {
            console.log(`📭 Nenhuma conversa encontrada para: "${searchTerm}"`);
            return new Response(JSON.stringify([]), {
                status: 200, headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log(`🎯 ${conversations.length} conversas encontradas para: "${searchTerm}"`);

        // Busca mensagens para as conversas encontradas
        const conversationIds = conversations.map(c => c.id);
        const { data: messages, error: msgError } = await supabase
            .from('messages')
            .select('id, timestamp, sender, content, fromMe, conversation_id, created_at')
            .in('conversation_id', conversationIds)
            .order('conversation_id, timestamp', { ascending: true })
            .limit(1000); // Limita mensagens por performance

        if (msgError) {
            console.error('❌ Erro ao buscar mensagens:', msgError);
            throw msgError;
        }

        // Agrupa mensagens por conversa
        const messagesByConv = new Map();
        messages?.forEach(msg => {
            if (!messagesByConv.has(msg.conversation_id)) {
                messagesByConv.set(msg.conversation_id, []);
            }
            messagesByConv.get(msg.conversation_id).push(msg);
        });

        // Monta resultado final
        const conversationsWithMessages = conversations.map(conv => ({
            ...conv,
            messages: messagesByConv.get(conv.id) || []
        }));

        console.log(`✅ BUSCA: ${conversations.length} conversas com ${messages?.length || 0} mensagens`);

        return new Response(JSON.stringify(conversationsWithMessages), {
            status: 200, headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error('❌ Erro na API de busca:', error);
        return new Response(JSON.stringify({ error: "Failed to search conversations", details: error.message }), {
            status: 500, headers: { 'Content-Type': 'application/json' }
        });
    }
}
