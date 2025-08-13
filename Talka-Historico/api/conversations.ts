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

        if (!userId) {
            return new Response(JSON.stringify({ error: 'User ID is required' }), {
                status: 400, headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log(`🚀 Carregamento PADRÃO: userId=${userId} (primeiros 100 para visualização ágil)`);
        console.log(`📋 LOG SISTEMA HÍBRIDO: API conversations.ts chamada - carregamento PADRÃO`);
        console.log(`🔧 LOG DEBUG: timestamp=${new Date().toISOString()}`);
        
        // CARREGAMENTO PADRÃO: Primeiros 100 para visualização ágil em 10 páginas
        const { data: conversations, error } = await supabase
            .from('conversations')
            .select('id, title, user_id, created_at')
            .eq('user_id', parseInt(userId))
            .order('created_at', { ascending: false })
            .limit(100); // Limita aos primeiros 100 para paginação ágil (10 páginas de 10)
            
        if (error) {
            console.error('❌ Erro ao buscar conversas:', error);
            throw error;
        }
        
        console.log(`✅ LOG SUPABASE RETORNOU: ${conversations?.length || 0} conversas do banco`);
        
        if (!conversations || conversations.length === 0) {
            console.log('📭 Nenhuma conversa encontrada');
            return new Response(JSON.stringify([]), {
                status: 200, headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log(`📊 CARREGAMENTO PADRÃO: ${conversations.length} conversas (primeiros 100 para visualização ágil)`);
        
        // 🔍 LOG: Análise dos títulos das conversas do carregamento padrão
        console.log(`🔍 TÍTULOS DAS CONVERSAS (CARREGAMENTO PADRÃO - PRIMEIROS 100):`);
        const firstFive = conversations.slice(0, 5);
        firstFive.forEach((conv, index) => {
            console.log(`  ${index + 1}. ID: ${conv.id} | Título: "${conv.title}" | Created: ${conv.created_at}`);
        });
        if (conversations.length > 5) {
            console.log(`  ... e mais ${conversations.length - 5} conversas`);
        }

        const conversationIds = conversations.map(c => c.id);
        console.log(`📋 Buscando mensagens para ${conversationIds.length} conversas...`);

        // SEGUNDA QUERY: Busca todas as mensagens das conversas (otimizado para 100 conversas)
        const { data: messages, error: msgError } = await supabase
            .from('messages')
            .select('id, timestamp, sender, content, fromMe, conversation_id, created_at')
            .in('conversation_id', conversationIds)
            .order('conversation_id, timestamp', { ascending: true })
            .limit(10000); // Limite reduzido para 100 conversas

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
            totalAvailable: '11400+ (mostrando primeiros 100)',
            isLimitReached: conversations.length >= 100,
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