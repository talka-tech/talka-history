import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { user_id: userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'user_id é obrigatório' });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Configuração do Supabase ausente:', {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey 
      });
      return res.status(500).json({ error: 'Configuração do Supabase ausente' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('🔑 Usando SERVICE_ROLE_KEY via cliente Supabase');

    // MÉTODO SUPER SIMPLES: Delete direto sem buscar IDs
    console.log(`🗑️ MODO SIMPLES: Deletando dados para usuário ${userId}...`);
    
    // Step 1: Delete messages WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id = X)
    console.log(`🗑️ Deletando mensagens...`);
    const { error: messagesError } = await supabase.rpc('delete_user_messages', {
      user_id_param: userId
    });

    if (messagesError) {
      console.error('❌ Erro ao deletar mensagens:', messagesError);
      // Fallback: tentar delete simples
      const { error: simpleMsgError } = await supabase
        .from('messages')
        .delete()
        .in('conversation_id', 
          supabase.from('conversations').select('id').eq('user_id', userId)
        );
      
      if (simpleMsgError) {
        throw new Error(`Erro ao deletar mensagens: ${simpleMsgError.message}`);
      }
    }

    // Step 2: Delete conversations directly
    console.log(`🗑️ Deletando conversas...`);
    const { error: conversationsError, count: deletedConversations } = await supabase
      .from('conversations')
      .delete({ count: 'exact' })
      .eq('user_id', userId);

    if (conversationsError) {
      console.error('❌ Erro ao deletar conversas:', conversationsError);
      throw new Error(`Erro ao deletar conversas: ${conversationsError.message}`);
    }

    console.log(`🎉 Limpeza concluída: ${deletedConversations} conversas removidas`);

    return res.status(200).json({
      success: true,
      deletedConversations: deletedConversations || 0,
      deletedMessages: 'N/A (via RPC)',
      message: `${deletedConversations} conversas removidas com sucesso!`,
      method: 'supabase-simple-mode'
    });

  } catch (error: any) {
    console.error('❌ Erro geral:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message,
      method: 'supabase-simple-mode'
    });
  }
}
