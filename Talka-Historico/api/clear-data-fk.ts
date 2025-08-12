import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID obrigatório' });
    }

    console.log(`🗑️ [FK SOLUTION] Limpando dados - Usuário: ${userId}`);

    // Configuração Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ error: 'Configuração do Supabase ausente' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 🔥 SOLUÇÃO FK: Deletar mensagens primeiro, depois conversas
    console.log(`🗑️ STEP 1: Buscando conversas do usuário...`);
    
    const { data: userConversations, error: convFetchError } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', userId);

    if (convFetchError) {
      throw new Error(`Erro ao buscar conversas: ${convFetchError.message}`);
    }

    const conversationIds = userConversations?.map(c => c.id) || [];
    console.log(`📋 Encontradas ${conversationIds.length} conversas`);

    let deletedMessagesCount = 0;
    let deletedConversationsCount = 0;

    if (conversationIds.length > 0) {
      // 🔥 STEP 2: Deletar TODAS as mensagens primeiro
      console.log(`🗑️ STEP 2: Deletando TODAS as mensagens...`);
      
      const { error: messagesError, count: msgCount } = await supabase
        .from('messages')
        .delete({ count: 'exact' })
        .in('conversation_id', conversationIds);

      if (messagesError) {
        throw new Error(`Erro ao deletar mensagens: ${messagesError.message}`);
      }

      deletedMessagesCount = msgCount || 0;
      console.log(`✅ ${deletedMessagesCount} mensagens deletadas`);

      // 🔥 STEP 3: Agora deletar conversas (FK resolvida)
      console.log(`🗑️ STEP 3: Deletando conversas...`);
      
      const { error: conversationsError, count: convCount } = await supabase
        .from('conversations')
        .delete({ count: 'exact' })
        .eq('user_id', userId);

      if (conversationsError) {
        throw new Error(`Erro ao deletar conversas: ${conversationsError.message}`);
      }

      deletedConversationsCount = convCount || 0;
      console.log(`✅ ${deletedConversationsCount} conversas deletadas`);
    }

    console.log(`🎉 Limpeza FK concluída: ${deletedConversationsCount} conversas e ${deletedMessagesCount} mensagens`);

    return res.status(200).json({
      success: true,
      deletedConversations: deletedConversationsCount,
      deletedMessages: deletedMessagesCount,
      message: `${deletedConversationsCount} conversas e ${deletedMessagesCount} mensagens removidas!`,
      method: 'supabase-fk-solution'
    });

  } catch (error: any) {
    console.error('❌ Erro:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message,
      method: 'supabase-fk-solution'
    });
  }
}
