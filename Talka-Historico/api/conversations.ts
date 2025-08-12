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
        console.log(`🔍 DEBUGGING: IMPLEMENTANDO MÚLTIPLAS QUERIES para contornar limite 1000...`);
        
        // MÚLTIPLAS QUERIES: Busca em lotes para contornar limite do Supabase
        let allConversations: any[] = [];
        let offset = 0;
        const batchSize = 1000; // Tamanho do lote (limite do Supabase)
        let hasMore = true;
        let batchCount = 0;
        
        while (hasMore && allConversations.length < 50000) {
            const startRange = offset;
            const endRange = offset + batchSize - 1;
            console.log(`🔍 DEBUGGING: Batch ${batchCount}, range ${startRange}-${endRange}...`);
            
            const { data: batchConversations, error: batchError } = await supabase
                .from('conversations')
                .select('id, title, user_id, created_at')
                .eq('user_id', parseInt(userId))
                .order('created_at', { ascending: false })
                .range(startRange, endRange);
                
            console.log(`🔍 DEBUGGING: Batch ${batchCount} retornou:`, batchConversations?.length || 0, 'conversas');
            
            if (batchError) {
                console.error('❌ Erro no batch', batchCount, ':', batchError);
                throw batchError;
            }
            
            if (!batchConversations || batchConversations.length === 0) {
                console.log(`🔍 DEBUGGING: Batch ${batchCount} vazio, parando busca`);
                hasMore = false;
                break;
            }
            
            allConversations.push(...batchConversations);
            console.log(`🔍 DEBUGGING: Total acumulado: ${allConversations.length} conversas`);
            
            // Se retornou menos que batchSize, é o último lote
            if (batchConversations.length < batchSize) {
                console.log(`🔍 DEBUGGING: Batch ${batchCount} parcial (${batchConversations.length}), último lote`);
                hasMore = false;
            }
            
            offset += batchSize;
            batchCount++;
            
            // Limite de segurança para evitar loop infinito
            if (batchCount > 20) {
                console.log(`🔍 DEBUGGING: Limite de 20 batches atingido, parando por segurança`);
                break;
            }
        }
        
        const conversations = allConversations;
        console.log(`🔍 DEBUGGING: MÚLTIPLAS QUERIES finalizadas!`);
        console.log(`🔍 DEBUGGING: Total final: ${conversations.length} conversas em ${batchCount} batches`);

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