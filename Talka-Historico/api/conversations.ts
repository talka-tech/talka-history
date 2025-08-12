// api/conversations.ts
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
        const limit = parseInt(url.searchParams.get('limit') || '25000'); // Limite para 25k conversas (11.450 + margem)

        if (!userId) {
            return new Response(JSON.stringify({ error: 'User ID is required' }), {
                status: 400, headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log(`🚀 Carregando conversas: userId=${userId}, limit=${limit}`);
        console.log(`🔍 DEBUGGING: Iniciando query no Supabase...`);
        
        // PRIMEIRA QUERY: Busca conversas (otimizado) - LIMITE EXPLICITO ALTO!
        const { data: conversations, error: convError } = await supabase
            .from('conversations')
            .select('id, title, user_id, created_at')
            .eq('user_id', parseInt(userId))
            .order('created_at', { ascending: false })
            .limit(50000); // LIMITE EXPLÍCITO ALTO para garantir todas as conversas

        console.log(`🔍 DEBUGGING: Query executada!`);
        console.log(`🔍 DEBUGGING: conversations =`, conversations);
        console.log(`🔍 DEBUGGING: convError =`, convError);
        console.log(`🔍 DEBUGGING: conversations.length =`, conversations?.length);
        console.log(`🔍 DEBUGGING: Tipo de conversations:`, typeof conversations, Array.isArray(conversations));
        
        if (convError) {
            console.error('❌ Erro ao buscar conversas:', convError);
            throw convError;
        }

        if (!conversations || conversations.length === 0) {
            console.log('📭 Nenhuma conversa encontrada');
            console.log(`🔍 DEBUGGING: conversations é null/undefined:`, conversations === null, conversations === undefined);
            return new Response(JSON.stringify([]), {
                status: 200, headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log(`📊 CONVERSAS RETORNADAS DO SUPABASE: ${conversations.length} de ${userId}`);
        console.log(`🔍 DEBUGGING: Primeiras 3 conversas:`, conversations.slice(0, 3));
        
        // 🔍 LOG: Análise dos títulos das conversas retornadas do banco
        console.log(`🔍 TÍTULOS DAS CONVERSAS RETORNADAS DO BANCO:`);
        const firstFive = conversations.slice(0, 5);
        firstFive.forEach((conv, index) => {
            console.log(`  ${index + 1}. ID: ${conv.id} | Título: "${conv.title}" | Created: ${conv.created_at}`);
        });
        if (conversations.length > 5) {
            console.log(`  ... e mais ${conversations.length - 5} conversas`);
        }

        const conversationIds = conversations.map(c => c.id);
        console.log(`📋 Buscando mensagens para ${conversationIds.length} conversas...`);

        // SEGUNDA QUERY: Busca todas as mensagens das conversas (otimizado com limite)
        const { data: messages, error: msgError } = await supabase
            .from('messages')
            .select('id, timestamp, sender, content, fromMe, conversation_id, created_at')
            .in('conversation_id', conversationIds)
            .order('conversation_id, timestamp', { ascending: true })
            .limit(50000); // Limite aumentado para grandes volumes

        if (msgError) {
            console.error('❌ Erro ao buscar mensagens:', msgError);
            throw msgError;
        }

        // TERCEIRA ETAPA: Agrupa mensagens por conversa (rápido em memória)
        const messagesByConv = new Map();
        messages?.forEach(msg => {
            if (!messagesByConv.has(msg.conversation_id)) {
                messagesByConv.set(msg.conversation_id, []);
            }
            messagesByConv.get(msg.conversation_id).push(msg);
        });

        // QUARTA ETAPA: Monta o resultado final
        const conversationsWithMessages = conversations.map(conv => ({
            ...conv,
            messages: messagesByConv.get(conv.id) || []
        }));

        console.log(`✅ API: ${conversations.length} conversas com ${messages?.length || 0} mensagens carregadas!`);
        console.log(`🔍 DEBUGGING: conversationsWithMessages.length =`, conversationsWithMessages.length);
        console.log(`🔍 DEBUGGING: Tipo de conversationsWithMessages:`, typeof conversationsWithMessages, Array.isArray(conversationsWithMessages));
        console.log(`🔍 DEBUGGING: Primeiras 3 conversationsWithMessages:`, conversationsWithMessages.slice(0, 3));
        console.log(`🔍 DEBUGGING: JSON.stringify().length =`, JSON.stringify(conversationsWithMessages).length);

        return new Response(JSON.stringify(conversationsWithMessages), {
            status: 200, headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error('❌ Erro na API conversations:', error);
        return new Response(JSON.stringify({ error: "Failed to fetch conversations", details: error.message }), {
            status: 500, headers: { 'Content-Type': 'application/json' }
        });
    }
}