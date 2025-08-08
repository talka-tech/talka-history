export default async function handler(req: any, res: any) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const userId = req.headers['x-user-id'];
    const clearType = req.query.type as string; // 'conversations' ou 'all'

    if (!userId) {
      return res.status(400).json({ error: 'User ID obrigatório' });
    }

    console.log(`🗑️ Limpando dados - Usuário: ${userId}, Tipo: ${clearType}`);

    // Configuração Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Configuração do Supabase ausente' });
    }

    let deletedConversations = 0;
    let deletedMessages = 0;

    if (clearType === 'conversations' || clearType === 'all') {
      // Primeiro: buscar conversas do usuário
      const conversationsResponse = await fetch(`${supabaseUrl}/rest/v1/conversations?user_id=eq.${userId}&select=id`, {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (conversationsResponse.ok) {
        const conversations = await conversationsResponse.json();
        console.log(`📋 Encontradas ${conversations.length} conversas para deletar`);

        if (conversations.length > 0) {
          const conversationIds = conversations.map((c: any) => c.id);

          // Deletar mensagens primeiro (FK constraint)
          const messagesDeleteResponse = await fetch(`${supabaseUrl}/rest/v1/messages?conversation_id=in.(${conversationIds.join(',')})`, {
            method: 'DELETE',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json'
            }
          });

          if (messagesDeleteResponse.ok) {
            console.log('✅ Mensagens deletadas com sucesso');
            deletedMessages = conversationIds.length; // Aproximação
          }

          // Depois deletar conversas
          const conversationsDeleteResponse = await fetch(`${supabaseUrl}/rest/v1/conversations?user_id=eq.${userId}`, {
            method: 'DELETE',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json'
            }
          });

          if (conversationsDeleteResponse.ok) {
            console.log('✅ Conversas deletadas com sucesso');
            deletedConversations = conversations.length;
          }
        }
      }
    }

    console.log(`🎉 Limpeza concluída: ${deletedConversations} conversas e ${deletedMessages} mensagens removidas`);

    return res.status(200).json({
      success: true,
      deletedConversations,
      deletedMessages,
      message: `${deletedConversations} conversas removidas com sucesso`
    });

  } catch (error) {
    console.error('❌ Erro ao limpar dados:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
}
