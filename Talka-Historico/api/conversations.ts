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
        
        // PRIMEIRA QUERY: Busca conversas com PAGINAÇÃO FORÇADA (contornar limite)
        let allConversations: any[] = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;
        
        console.log(`🔍 DEBUGGING: Iniciando busca paginada...`);
        
        while (hasMore && allConversations.length < 50000) {
            const offset = page * pageSize;
            console.log(`🔍 DEBUGGING: Buscando página ${page}, offset ${offset}, pageSize ${pageSize}`);
            
            const { data: pageConversations, error: pageError } = await supabase
                .from('conversations')
                .select('id, title, user_id, created_at')
                .eq('user_id', parseInt(userId))
                .order('created_at', { ascending: false })
                .range(offset, offset + pageSize - 1); // Usando range ao invés de limit
                
            console.log(`🔍 DEBUGGING: Página ${page} retornou:`, pageConversations?.length || 0, 'conversas');
            
            if (pageError) {
                console.error('❌ Erro ao buscar conversas página', page, ':', pageError);
                throw pageError;
            }
            
            if (!pageConversations || pageConversations.length === 0) {
                console.log(`🔍 DEBUGGING: Página ${page} vazia, parando busca`);
                hasMore = false;
                break;
            }
            
            allConversations.push(...pageConversations);
            
            // Se retornou menos que pageSize, é a última página
            if (pageConversations.length < pageSize) {
                console.log(`🔍 DEBUGGING: Página ${page} parcial (${pageConversations.length}), última página`);
                hasMore = false;
            }
            
            page++;
            console.log(`🔍 DEBUGGING: Total acumulado: ${allConversations.length} conversas`);
        }
        
        const conversations = allConversations;
        console.log(`🔍 DEBUGGING: Query paginada finalizada!`);
        console.log(`🔍 DEBUGGING: conversations =`, conversations.length, 'conversas');
        console.log(`🔍 DEBUGGING: Tipo de conversations:`, typeof conversations, Array.isArray(conversations));

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

        // DEBUGGING: Adiciona logs no response para debug
        const debugInfo = {
            supabaseReturnedCount: conversations.length,
            finalArrayCount: conversationsWithMessages.length,
            messagesCount: messages?.length || 0,
            isProduction: process.env.NODE_ENV === 'production'
        };

        // TEMPORÁRIO: Adiciona debug info no response
        const responseWithDebug = {
            conversations: conversationsWithMessages,
            debug: debugInfo
        };

        return new Response(JSON.stringify(responseWithDebug), {
            status: 200, headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error('❌ Erro na API conversations:', error);
        return new Response(JSON.stringify({ error: "Failed to fetch conversations", details: error.message }), {
            status: 500, headers: { 'Content-Type': 'application/json' }
        });
    }
}