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
    const { conversationId, userId } = req.body;

    if (!conversationId || !userId) {
      return res.status(400).json({ 
        error: 'Missing required parameters: conversationId, userId' 
      });
    }

    console.log('🗑️ Excluindo conversa:', { conversationId, userId });

    // Verifica se a conversa pertence ao usuário
    const { data: conversationCheck, error: checkError } = await supabase
      .from('conversations')
      .select('id, user_id')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single();

    if (checkError || !conversationCheck) {
      console.error('❌ Conversa não encontrada ou não pertence ao usuário:', checkError);
      return res.status(403).json({ error: 'Acesso negado à conversa' });
    }

    // Primeiro, exclui todas as mensagens da conversa (CASCADE deveria fazer isso automaticamente, mas vamos garantir)
    const { error: messagesDeleteError } = await supabase
      .from('messages')
      .delete()
      .eq('conversation_id', conversationId);

    if (messagesDeleteError) {
      console.error('❌ Erro ao excluir mensagens da conversa:', messagesDeleteError);
      return res.status(500).json({ error: 'Erro ao excluir mensagens da conversa' });
    }

    // Agora exclui a conversa
    const { error: conversationDeleteError } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', userId);

    if (conversationDeleteError) {
      console.error('❌ Erro ao excluir conversa:', conversationDeleteError);
      return res.status(500).json({ error: 'Erro ao excluir conversa' });
    }

    console.log('✅ Conversa excluída com sucesso');

    return res.status(200).json({
      success: true,
      message: 'Conversa excluída com sucesso'
    });

  } catch (error) {
    console.error('❌ Erro interno:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
}
