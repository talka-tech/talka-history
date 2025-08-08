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

    // Primeiro: buscar conversas do usuário
    console.log(`🔍 Buscando conversas para usuário ${userId}...`);
    const { data: conversations, error: fetchError } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', userId);

    if (fetchError) {
      console.error('❌ Erro ao buscar conversas:', fetchError);
      throw new Error(`Erro ao buscar conversas: ${fetchError.message}`);
    }

    console.log(`📋 Encontradas ${conversations?.length || 0} conversas para deletar:`, conversations);

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

      // Deletar mensagens primeiro (FK constraint)
      console.log(`🗑️ Deletando ${messageCount || 'todas as'} mensagens...`);
      const { error: messagesDeleteError } = await supabase
        .from('messages')
        .delete()
        .in('conversation_id', conversationIds);

      if (messagesDeleteError) {
        console.error('❌ Erro ao deletar mensagens:', messagesDeleteError);
        throw new Error(`Erro ao deletar mensagens: ${messagesDeleteError.message}`);
      } else {
        console.log('✅ Mensagens deletadas com sucesso');
        deletedMessages = messageCount || 0;
      }

      // Depois deletar conversas
      console.log(`🗑️ Deletando ${conversations.length} conversas...`);
      const { error: conversationsDeleteError } = await supabase
        .from('conversations')
        .delete()
        .eq('user_id', userId);

      if (conversationsDeleteError) {
        console.error('❌ Erro ao deletar conversas:', conversationsDeleteError);
        throw new Error(`Erro ao deletar conversas: ${conversationsDeleteError.message}`);
      } else {
        console.log('✅ Conversas deletadas com sucesso');
        deletedConversations = conversations.length;
      }
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
