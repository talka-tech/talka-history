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

        console.log(`🚀 Carregando conversas: userId=${userId} (buscando TODAS as 11k+)`);
        
        // PAGINAÇÃO AUTOMÁTICA: Busca TODAS as conversas em lotes
        let allConversations: any[] = [];
        let page = 0;
        const pageSize = 1000; // Limite por página do Supabase
        let hasMore = true;
        
        console.log(`📊 Iniciando busca paginada para carregar TODAS as conversas...`);
        
        while (hasMore && page < 20) { // Máximo 20 páginas = 20k conversas
            const offset = page * pageSize;
            console.log(`🔄 Página ${page + 1}: buscando conversas ${offset + 1}-${offset + pageSize}...`);
            
            const { data: pageConversations, error: pageError } = await supabase
                .from('conversations')
                .select('id, title, user_id, created_at')
                .eq('user_id', parseInt(userId))
                .order('created_at', { ascending: false })
                .range(offset, offset + pageSize - 1); // range(0, 999) = 1000 rows
                
            if (pageError) {
                console.error(`❌ Erro na página ${page + 1}:`, pageError);
                throw pageError;
            }
            
            if (!pageConversations || pageConversations.length === 0) {
                console.log(`✅ Página ${page + 1} vazia - fim da busca`);
                hasMore = false;
                break;
            }
            
            allConversations.push(...pageConversations);
            console.log(`📈 Página ${page + 1}: +${pageConversations.length} conversas | Total: ${allConversations.length}`);
            
            // Se retornou menos que pageSize, é a última página
            if (pageConversations.length < pageSize) {
                console.log(`✅ Última página encontrada (${pageConversations.length} < ${pageSize})`);
                hasMore = false;
            }
            
            page++;
        }
        
        const conversations = allConversations;
        console.log(`🎉 PAGINAÇÃO CONCLUÍDA: ${conversations.length} conversas carregadas!`);
        
        if (!conversations || conversations.length === 0) {
            console.log('📭 Nenhuma conversa encontrada');
            return new Response(JSON.stringify([]), {
                status: 200, headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log(`📊 ${conversations.length} conversas carregadas (${conversations.length >= 1000 ? 'limite atingido' : 'total'})`);
        
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
            totalAvailable: conversations.length >= 1000 ? '11400+' : conversations.length,
            isLimitReached: conversations.length >= 1000,
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