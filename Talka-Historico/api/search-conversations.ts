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
        console.log(`📋 LOG SISTEMA HÍBRIDO: API search-conversations.ts chamada - BUSCA INDIVIDUAL`);
        console.log(`🔧 LOG DEBUG: timestamp=${new Date().toISOString()}`);
        console.log(`🎯 LOG IMPORTANTE: Esta API vai buscar entre TODAS as conversas (sem limite 1000)`);
        
        // Normaliza o termo de busca removendo caracteres especiais
        const normalizedSearchTerm = searchTerm.replace(/[^\d]/g, ''); // Remove tudo que não é dígito
        console.log(`🔍 BUSCA NORMALIZADA: "${searchTerm}" → "${normalizedSearchTerm}"`);
        
        // BUSCA DUPLA: busca tanto no título original quanto em versão normalizada
        let conversations: any[] = [];
        
        // 1. Busca no título original (para textos e números formatados)
        const { data: titleResults, error: titleError } = await supabase
            .from('conversations')
            .select('id, title, user_id, created_at')
            .eq('user_id', parseInt(userId))
            .ilike('title', `%${searchTerm}%`)
            .order('created_at', { ascending: false })
            .limit(100);
            
        if (titleError) {
            console.error('❌ Erro na busca por título:', titleError);
            throw titleError;
        }
        
        conversations.push(...(titleResults || []));
        console.log(`📋 BUSCA POR TÍTULO: ${titleResults?.length || 0} resultados`);
        
        // 2. Se é número, busca também normalizada (remove formatação)
        if (normalizedSearchTerm.length >= 3) {
            console.log(`🔢 BUSCA NUMÉRICA: Procurando números que contenham "${normalizedSearchTerm}"`);
            console.log(`🎯 BUSCA NUMÉRICA: SEM LIMITE - buscando entre TODAS as conversas do usuário`);
            
            // BUSCA SEM LIMITE: pega TODAS as conversas para busca numérica
            let allConversations: any[] = [];
            let page = 0;
            const pageSize = 1000;
            let hasMore = true;
            
            console.log(`📊 BUSCA NUMÉRICA: Sistema de paginação para buscar TODAS as conversas...`);
            
            while (hasMore && page < 50) { // Máximo 50 páginas = 50k conversas
                const startIndex = page * pageSize;
                const endIndex = startIndex + pageSize - 1;
                
                console.log(`🔄 BUSCA NUMÉRICA Página ${page + 1}: buscando registros ${startIndex}-${endIndex}...`);
                
                const { data: pageData, error: pageError } = await supabase
                    .from('conversations')
                    .select('id, title, user_id, created_at')
                    .eq('user_id', parseInt(userId))
                    .order('created_at', { ascending: false })
                    .range(startIndex, endIndex);
                    
                if (pageError) {
                    console.error(`❌ BUSCA NUMÉRICA Erro na página ${page + 1}:`, pageError);
                    break;
                }
                
                if (!pageData || pageData.length === 0) {
                    console.log(`✅ BUSCA NUMÉRICA Fim dos dados na página ${page + 1}`);
                    hasMore = false;
                    break;
                }
                
                allConversations.push(...pageData);
                console.log(`📈 BUSCA NUMÉRICA Página ${page + 1}: +${pageData.length} conversas | Total acumulado: ${allConversations.length}`);
                
                // Se retornou menos que 1000, é a última página
                if (pageData.length < pageSize) {
                    console.log(`✅ BUSCA NUMÉRICA Última página: ${pageData.length} < ${pageSize}`);
                    hasMore = false;
                }
                
                page++;
            }
            
            console.log(`🎉 BUSCA NUMÉRICA COMPLETA: ${allConversations.length} conversas carregadas para filtrar!`);
            
            // Filtra no código: encontra conversas cujo título normalizado contém o número
            const numericMatches = allConversations.filter(conv => {
                const normalizedTitle = conv.title.replace(/[^\d]/g, '');
                const matches = normalizedTitle.includes(normalizedSearchTerm);
                if (matches) {
                    console.log(`✅ MATCH NUMÉRICO: "${conv.title}" → "${normalizedTitle}" contém "${normalizedSearchTerm}"`);
                }
                return matches;
            });
            
            console.log(`🔢 BUSCA NUMÉRICA: ${numericMatches.length} resultados adicionais`);
            
            // Adiciona resultados únicos (evita duplicatas)
            numericMatches.forEach(match => {
                if (!conversations.find(c => c.id === match.id)) {
                    conversations.push(match);
                }
            });
        }
        
        // Remove duplicatas e limita resultados
        const uniqueConversations = conversations
            .filter((conv, index, self) => self.findIndex(c => c.id === conv.id) === index)
            .slice(0, 100);
            
        console.log(`✅ LOG BUSCA FINAL: ${uniqueConversations.length} conversas únicas encontradas`);

        if (!uniqueConversations || uniqueConversations.length === 0) {
            console.log(`📭 Nenhuma conversa encontrada para: "${searchTerm}" (nem título nem número)`);
            return new Response(JSON.stringify([]), {
                status: 200, headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log(`🎯 ${uniqueConversations.length} conversas encontradas para: "${searchTerm}"`);

        // Busca mensagens para as conversas encontradas
        const conversationIds = uniqueConversations.map(c => c.id);
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
        const conversationsWithMessages = uniqueConversations.map(conv => ({
            ...conv,
            messages: messagesByConv.get(conv.id) || []
        }));

        console.log(`✅ BUSCA: ${uniqueConversations.length} conversas com ${messages?.length || 0} mensagens`);

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
