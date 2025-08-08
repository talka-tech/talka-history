import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: any, res: any) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messageId, conversationId, userId } = req.body;

    if (!messageId || !conversationId || !userId) {
      return res.status(400).json({ 
        error: 'Missing required parameters: messageId, conversationId, userId' 
      });
    }

    console.log('🗑️ Excluindo mensagem:', { messageId, conversationId, userId });

    // Verifica se a mensagem existe e pertence ao usuário
    const { data: messageCheck, error: checkError } = await supabase
      .from('messages')
      .select('id, conversation_id')
      .eq('id', messageId)
      .eq('conversation_id', conversationId)
      .single();

    if (checkError || !messageCheck) {
      console.error('❌ Mensagem não encontrada:', checkError);
      return res.status(404).json({ error: 'Mensagem não encontrada' });
    }

    // Verifica se a conversa pertence ao usuário
    const { data: conversationCheck, error: convError } = await supabase
      .from('conversations')
      .select('id, user_id')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single();

    if (convError || !conversationCheck) {
      console.error('❌ Conversa não encontrada ou não pertence ao usuário:', convError);
      return res.status(403).json({ error: 'Acesso negado à conversa' });
    }

    // Exclui a mensagem
    const { error: deleteError } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId)
      .eq('conversation_id', conversationId);

    if (deleteError) {
      console.error('❌ Erro ao excluir mensagem:', deleteError);
      return res.status(500).json({ error: 'Erro ao excluir mensagem' });
    }

    // Atualiza a contagem de mensagens na conversa
    const { data: remainingMessages, error: countError } = await supabase
      .from('messages')
      .select('id', { count: 'exact' })
      .eq('conversation_id', conversationId);

    if (!countError && remainingMessages) {
      const messageCount = remainingMessages.length;
      
      // Atualiza a conversa com a nova contagem
      const { error: updateError } = await supabase
        .from('conversations')
        .update({ message_count: messageCount })
        .eq('id', conversationId);

      if (updateError) {
        console.warn('⚠️ Erro ao atualizar contagem de mensagens:', updateError);
      }
    }

    console.log('✅ Mensagem excluída com sucesso');

    return res.status(200).json({
      success: true,
      message: 'Mensagem excluída com sucesso'
    });

  } catch (error) {
    console.error('❌ Erro interno:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
}
