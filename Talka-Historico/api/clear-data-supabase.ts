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
    
    // MÉTODO BRUTAL: Deleta TUDO de uma vez - mais simples e eficiente
    console.log(`🗑️ MODO BRUTAL: Deletando TODAS as mensagens do usuário ${userId}...`);
    
    // Step 1: Get all conversation IDs for this user first
    const { data: userConversations, error: convFetchError } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', userId);

    if (convFetchError) {
      console.error('❌ Erro ao buscar conversas do usuário:', convFetchError);
      throw new Error(`Erro ao buscar conversas: ${convFetchError.message}`);
    }

    const conversationIds = userConversations?.map(c => c.id) || [];
    console.log(`📋 Encontradas ${conversationIds.length} conversas para deletar`);

    let deletedMessagesCount = 0;
    let deletedConversationsCount = 0;

    if (conversationIds.length > 0) {
      // Step 2: Delete all messages for these conversations
      const { error: messagesDeleteError, count: msgCount } = await supabase
        .from('messages')
        .delete({ count: 'exact' })
        .in('conversation_id', conversationIds);

      if (messagesDeleteError) {
        console.error('❌ Erro ao deletar mensagens:', messagesDeleteError);
        throw new Error(`Erro ao deletar mensagens: ${messagesDeleteError.message}`);
      }

      deletedMessagesCount = msgCount || 0;
      console.log(`✅ ${deletedMessagesCount} mensagens deletadas`);
    }

    // Step 3: Delete all conversations for this user
    console.log(`🗑️ MODO BRUTAL: Deletando TODAS as ${conversationIds.length} conversas do usuário ${userId}...`);
    
    const { error: conversationsDeleteError, count: convCount } = await supabase
      .from('conversations')
      .delete({ count: 'exact' })
      .eq('user_id', userId);

    if (conversationsDeleteError) {
      console.error('❌ Erro ao deletar conversas:', conversationsDeleteError);
      throw new Error(`Erro ao deletar conversas: ${conversationsDeleteError.message}`);
    }

    deletedConversationsCount = convCount || 0;
    console.log(`✅ ${deletedConversationsCount} conversas deletadas`);

    console.log(`🎉 Limpeza concluída: ${deletedConversationsCount} conversas e ${deletedMessagesCount} mensagens removidas`);

    return res.status(200).json({
      success: true,
      deletedConversations: deletedConversationsCount,
      deletedMessages: deletedMessagesCount,
      message: `${deletedConversationsCount} conversas e ${deletedMessagesCount} mensagens removidas com sucesso!`,
      method: 'supabase-brutal-mode'
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
