export default async function handler(req: any, res: any) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Pegar userId do body ao invés de header
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID obrigatório' });
    }

    console.log(`🗑️ Limpando conversas - Usuário: ${userId}`);

    // Configuração Supabase com SERVICE_ROLE_KEY para ter permissões completas
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Configuração Supabase ausente:', { 
        hasUrl: !!supabaseUrl, 
        hasServiceKey: !!supabaseServiceKey 
      });
      return res.status(500).json({ error: 'Configuração do Supabase ausente' });
    }

    console.log('🔑 Usando SERVICE_ROLE_KEY para operações de delete');

    let deletedConversations = 0;
    let deletedMessages = 0;

    // Primeiro: buscar conversas do usuário
    console.log(`🔍 Buscando conversas para usuário ${userId}...`);
    const conversationsResponse = await fetch(`${supabaseUrl}/rest/v1/conversations?user_id=eq.${userId}&select=id`, {
      method: 'GET',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!conversationsResponse.ok) {
      const errorText = await conversationsResponse.text();
      console.error('❌ Erro ao buscar conversas:', conversationsResponse.status, errorText);
      throw new Error(`Erro ao buscar conversas: ${conversationsResponse.status} - ${errorText}`);
    }

    const conversations = await conversationsResponse.json();
    console.log(`📋 Encontradas ${conversations.length} conversas para deletar:`, conversations);

    if (conversations.length > 0) {
      const conversationIds = conversations.map((c: any) => c.id);
      console.log(`🔗 IDs das conversas:`, conversationIds);

      // Primeiro: contar quantas mensagens temos
      console.log(`📊 Contando mensagens...`);
      const messagesCountResponse = await fetch(`${supabaseUrl}/rest/v1/messages?conversation_id=in.(${conversationIds.join(',')})&select=count`, {
        method: 'HEAD',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Prefer': 'count=exact'
        }
      });
      
      const countHeader = messagesCountResponse.headers.get('content-range');
      const messageCount = countHeader ? parseInt(countHeader.split('/')[1] || '0') : 0;
      console.log(`📝 Total de mensagens encontradas: ${messageCount}`);

      // Deletar mensagens primeiro (FK constraint)
      console.log(`🗑️ Deletando ${messageCount} mensagens...`);
      const messagesDeleteResponse = await fetch(`${supabaseUrl}/rest/v1/messages?conversation_id=in.(${conversationIds.join(',')})`, {
        method: 'DELETE',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (messagesDeleteResponse.ok) {
        console.log('✅ Mensagens deletadas com sucesso');
        deletedMessages = messageCount;
      } else {
        const errorText = await messagesDeleteResponse.text();
        console.error('❌ Erro ao deletar mensagens:', messagesDeleteResponse.status, errorText);
        throw new Error(`Erro ao deletar mensagens: ${messagesDeleteResponse.status} - ${errorText}`);
      }

      // Depois deletar conversas
      console.log(`🗑️ Deletando ${conversations.length} conversas...`);
      const conversationsDeleteResponse = await fetch(`${supabaseUrl}/rest/v1/conversations?user_id=eq.${userId}`, {
        method: 'DELETE',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (conversationsDeleteResponse.ok) {
        console.log('✅ Conversas deletadas com sucesso');
        deletedConversations = conversations.length;
      } else {
        const errorText = await conversationsDeleteResponse.text();
        console.error('❌ Erro ao deletar conversas:', conversationsDeleteResponse.status, errorText);
        throw new Error(`Erro ao deletar conversas: ${conversationsDeleteResponse.status} - ${errorText}`);
      }
    } else {
      console.log('ℹ️ Nenhuma conversa encontrada para deletar');
    }

    console.log(`🎉 Limpeza concluída: ${deletedConversations} conversas e ${deletedMessages} mensagens removidas`);

    return res.status(200).json({
      success: true,
      deletedConversations,
      deletedMessages,
      message: `${deletedConversations} conversas e ${deletedMessages} mensagens removidas com sucesso!`
    });

  } catch (error) {
    console.error('❌ Erro ao limpar dados:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
}
