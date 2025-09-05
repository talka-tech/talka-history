// api/upload-chat.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const config = {
  runtime: 'edge',
};

interface Message {
  timestamp: string;
  sender: string;
  content: string;
  fromMe: boolean;
}

interface Conversation {
  id: string;
  title: string;
  participants: string[];
  messageCount: number;
  lastMessage: string;
  lastTimestamp: string;
  messages: Message[];
}

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!request.body) {
    return new Response(JSON.stringify({ error: 'No file body found in the request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return new Response(JSON.stringify({ error: 'User ID is required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Ler o arquivo de chat do WhatsApp
    const chatText = await request.text();
    
    if (!chatText || chatText.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Empty chat file' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing chat with ${chatText.length} characters for user ${userId}`);
    
    const conversation = parseWhatsAppChat(chatText);
    
    if (!conversation || conversation.messages.length === 0) {
      return new Response(JSON.stringify({ error: 'No valid messages found in chat file' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found conversation with ${conversation.messages.length} messages`);

    try {
      // Inserir/atualizar conversa
      const { error: convoError } = await supabase
        .from('conversations')
        .upsert({
          id: conversation.id,
          title: conversation.title,
          participants: conversation.participants,
          message_count: conversation.messageCount,
          last_message: conversation.lastMessage,
          last_timestamp: conversation.lastTimestamp,
          owner_user_id: parseInt(userId)
        }, {
          onConflict: 'id'
        });

      if (convoError) {
        console.error('Error inserting conversation:', convoError);
        throw convoError;
      }

      // Deletar mensagens existentes da conversa
      const { error: deleteError } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversation.id);

      if (deleteError) {
        console.error('Error deleting old messages:', deleteError);
      }

      // Inserir mensagens em lotes (para arquivos grandes)
      const messageBatchSize = 200; // 200 mensagens por vez
      let totalInserted = 0;

      for (let i = 0; i < conversation.messages.length; i += messageBatchSize) {
        const batch = conversation.messages.slice(i, i + messageBatchSize);
        
        const messagesToInsert = batch.map(msg => ({
          conversation_id: conversation.id,
          timestamp: msg.timestamp,
          sender: msg.sender,
          content: msg.content,
          from_me: msg.fromMe
        }));

        const { error: msgError } = await supabase
          .from('messages')
          .insert(messagesToInsert);

        if (msgError) {
          console.error('Error inserting messages batch:', msgError);
          throw msgError;
        }

        totalInserted += batch.length;
        console.log(`Inserted ${totalInserted}/${conversation.messages.length} messages`);
      }

      return new Response(JSON.stringify({ 
        message: `Conversa '${conversation.title}' salva com ${totalInserted} mensagens.`,
        conversation: {
          id: conversation.id,
          title: conversation.title,
          messageCount: totalInserted
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    } catch (dbError) {
      console.error('Database error:', dbError);
      return new Response(JSON.stringify({ 
        error: 'Failed to save conversation to database',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Upload chat error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to process chat file. Please check the file format.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Função para parsear chat do WhatsApp
function parseWhatsAppChat(chatText: string): Conversation | null {
  const lines = chatText.split('\n').filter(line => line.trim());
  if (lines.length === 0) return null;

  const messages: Message[] = [];
  const messageRegex = /^\[?(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s*(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?)\]?\s*-?\s*([^:]+):\s*(.+)$/;
  
  // Detectar participantes
  const participants = new Set<string>();
  
  for (const line of lines) {
    const match = line.match(messageRegex);
    if (match) {
      const [, date, time, sender, content] = match;
      
      // Converter data para ISO
      const dateParts = date.split('/');
      let year = parseInt(dateParts[2]);
      if (year < 100) year += 2000; // Converter anos de 2 dígitos
      
      const isoDate = new Date(year, parseInt(dateParts[1]) - 1, parseInt(dateParts[0]));
      const timeFormatted = time.replace(/[APap][Mm]/, '').trim();
      const timestamp = `${isoDate.toISOString().split('T')[0]}T${timeFormatted}:00.000Z`;
      
      const trimmedSender = sender.trim();
      participants.add(trimmedSender);
      
      // Detectar se é mensagem própria (você pode ajustar esta lógica)
      const fromMe = trimmedSender.toLowerCase().includes('você') || 
                     trimmedSender.toLowerCase().includes('you') ||
                     trimmedSender === 'Você';
      
      messages.push({
        timestamp,
        sender: trimmedSender,
        content: content.trim(),
        fromMe
      });
    }
  }

  if (messages.length === 0) return null;

  // Ordenar mensagens por timestamp
  messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  const participantsList = Array.from(participants);
  const lastMessage = messages[messages.length - 1];
  
  // Gerar título baseado nos participantes
  const otherParticipants = participantsList.filter(p => !p.toLowerCase().includes('você') && !p.toLowerCase().includes('you'));
  const title = otherParticipants.length > 0 
    ? `${otherParticipants[0]} ${otherParticipants.length > 1 ? `+${otherParticipants.length - 1} outros` : ''}`
    : `Conversa ${Date.now()}`;
  
  // ID único baseado no hash do conteúdo
  const conversationId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    id: conversationId,
    title,
    participants: participantsList,
    messageCount: messages.length,
    lastMessage: lastMessage.content.substring(0, 50) + (lastMessage.content.length > 50 ? '...' : ''),
    lastTimestamp: lastMessage.timestamp,
    messages
  };
}