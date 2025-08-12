import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Pegar userId do body
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID obrigatório' });
    }

    console.log(`🗑️ [SUPABASE CLIENT] Limpando conversas - Usuário: ${userId}`);

    // Configuração Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Configuração Supabase ausente:', { 
        hasUrl: !!supabaseUrl, 
        hasServiceKey: !!supabaseServiceKey 
      });
      return res.status(500).json({ error: 'Configuração do Supabase ausente' });
    }

    // Criar cliente Supabase com service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔑 Usando SERVICE_ROLE_KEY via cliente Supabase');

    // Primeiro: buscar TODAS as conversas do usuário (sem limite)
    console.log(`🔍 Buscando TODAS as conversas para usuário ${userId}...`);
    const { data: conversations, error: fetchError } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', userId)
      .limit(50000); // Força buscar até 50.000 conversas

    if (fetchError) {
      console.error('❌ Erro ao buscar conversas:', fetchError);
      throw new Error(`Erro ao buscar conversas: ${fetchError.message}`);
    }

    console.log(`📋 Encontradas ${conversations?.length || 0} conversas para deletar (TOTAL SEM LIMITE):`, conversations?.length);

    let deletedConversations = 0;
    let deletedMessages = 0;

    if (conversations && conversations.length > 0) {
      const conversationIds = conversations.map(c => c.id);
      console.log(`🔗 IDs das conversas:`, conversationIds);

      // Primeiro: contar mensagens
      console.log(`📊 Contando mensagens...`);
      const { count: messageCount, error: countError } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', conversationIds);

      if (countError) {
        console.error('❌ Erro ao contar mensagens:', countError);
      } else {
        console.log(`📝 Total de mensagens encontradas: ${messageCount}`);
      }

      // Deletar mensagens primeiro (FK constraint) - EM LOTES para evitar timeout
      console.log(`🗑️ Deletando ${messageCount || 'todas as'} mensagens em lotes...`);
      
      // Processa em lotes menores para evitar timeout com muitas conversas
      const DELETE_BATCH_SIZE = 500; // Reduzido para processar mais rápido
      let totalDeletedMessages = 0;
      
      for (let i = 0; i < conversationIds.length; i += DELETE_BATCH_SIZE) {
        const batch = conversationIds.slice(i, i + DELETE_BATCH_SIZE);
        const batchNumber = Math.floor(i / DELETE_BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(conversationIds.length / DELETE_BATCH_SIZE);
        
        console.log(`🗑️ Deletando lote ${batchNumber}/${totalBatches} (${batch.length} conversas)...`);
        
        const { error: messagesDeleteError, count } = await supabase
          .from('messages')
          .delete({ count: 'exact' })
          .in('conversation_id', batch);

        if (messagesDeleteError) {
          console.error(`❌ Erro ao deletar mensagens (lote ${batchNumber}):`, messagesDeleteError);
          // Continua com próximo lote mesmo se um falhar
          continue;
        } else {
          const deletedInBatch = count || 0;
          totalDeletedMessages += deletedInBatch;
          console.log(`✅ Lote ${batchNumber} concluído: ${deletedInBatch} mensagens deletadas`);
        }
      }
      
      console.log(`✅ Total de mensagens deletadas: ${totalDeletedMessages}`);
      deletedMessages = totalDeletedMessages;

      // Depois deletar conversas EM LOTES
      console.log(`🗑️ Deletando ${conversations.length} conversas em lotes...`);
      
      let totalDeletedConversations = 0;
      
      for (let i = 0; i < conversationIds.length; i += DELETE_BATCH_SIZE) {
        const batch = conversationIds.slice(i, i + DELETE_BATCH_SIZE);
        const batchNumber = Math.floor(i / DELETE_BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(conversationIds.length / DELETE_BATCH_SIZE);
        
        console.log(`🗑️ Deletando conversas lote ${batchNumber}/${totalBatches} (${batch.length} conversas)...`);
        
        const { error: conversationsDeleteError, count } = await supabase
          .from('conversations')
          .delete({ count: 'exact' })
          .in('id', batch);

        if (conversationsDeleteError) {
          console.error(`❌ Erro ao deletar conversas (lote ${batchNumber}):`, conversationsDeleteError);
          // Continua com próximo lote mesmo se um falhar
          continue;
        } else {
          const deletedInBatch = count || 0;
          totalDeletedConversations += deletedInBatch;
          console.log(`✅ Lote ${batchNumber} concluído: ${deletedInBatch} conversas deletadas`);
        }
      }
      
      console.log(`✅ Total de conversas deletadas: ${totalDeletedConversations}`);
      deletedConversations = totalDeletedConversations;
    } else {
      console.log('ℹ️ Nenhuma conversa encontrada para deletar');
    }

    console.log(`🎉 Limpeza concluída: ${deletedConversations} conversas e ${deletedMessages} mensagens removidas`);

    return res.status(200).json({
      success: true,
      deletedConversations,
      deletedMessages,
      message: `${deletedConversations} conversas e ${deletedMessages} mensagens removidas com sucesso!`,
      method: 'supabase-client'
    });

  } catch (error) {
    console.error('❌ Erro ao limpar dados:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
      method: 'supabase-client'
    });
  }
}
