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
    // Ler o arquivo CSV diretamente do request body
    const csvText = await request.text();
    
    if (!csvText || csvText.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Empty CSV file' }), {
        status: 400, 
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing CSV with ${csvText.length} characters for user ${userId}`);
    
    const conversations = parseCSVToConversations(csvText);
    
    if (conversations.length === 0) {
      return new Response(JSON.stringify({ error: 'No valid conversations found in CSV' }), {
        status: 400, 
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${conversations.length} conversations to process`);

    // Processar em lotes para evitar timeout com arquivos grandes
    const batchSize = 5; // Processar 5 conversas por vez
    let totalProcessed = 0;

    for (let i = 0; i < conversations.length; i += batchSize) {
      const batch = conversations.slice(i, i + batchSize);
      
      for (const convo of batch) {
        try {
          // Inserir/atualizar conversa
          const { error: convoError } = await supabase
            .from('conversations')
            .upsert({
              id: convo.id,
              title: convo.title,
              participants: convo.participants,
              message_count: convo.messageCount,
              last_message: convo.lastMessage,
              last_timestamp: convo.lastTimestamp,
              owner_user_id: parseInt(userId)
            }, {
              onConflict: 'id'
            });

          if (convoError) {
            console.error('Error inserting conversation:', convoError);
            continue;
          }

          // Deletar mensagens existentes da conversa
          const { error: deleteError } = await supabase
            .from('messages')
            .delete()
            .eq('conversation_id', convo.id);

          if (deleteError) {
            console.error('Error deleting old messages:', deleteError);
          }

          // Inserir mensagens em lotes
          const messageBatchSize = 100; // 100 mensagens por vez
          for (let j = 0; j < convo.messages.length; j += messageBatchSize) {
            const messageBatch = convo.messages.slice(j, j + messageBatchSize);
            
            const messagesToInsert = messageBatch.map(msg => ({
              conversation_id: convo.id,
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
            }
          }

          totalProcessed++;
          console.log(`Processed conversation ${totalProcessed}/${conversations.length}: ${convo.title}`);
          
        } catch (convError) {
          console.error(`Error processing conversation ${convo.id}:`, convError);
          continue;
        }
      }
    }
    
    return new Response(JSON.stringify({ 
      message: `${totalProcessed} conversas processadas com sucesso.`,
      total: conversations.length,
      processed: totalProcessed
    }), {
      status: 200, 
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Upload CSV Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to process CSV file. Please check the file format.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500, 
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// --- Funções de Parsing ---
function parseCSVToConversations(csvText: string): Conversation[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(',').map(h => h.trim());
  const messages: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    const values = parseCSVLine(line);
    
    if (values.length >= headers.length) {
      const chat_id = values[headers.indexOf('chat_id')]?.trim();
      const mobile_number = values[headers.indexOf('mobile_number')]?.trim();
      const fromMe = values[headers.indexOf('fromMe')]?.trim();
      const text = values[headers.indexOf('text')]?.trim();
      const message_created = values[headers.indexOf('message_created')]?.trim();
      const type = values[headers.indexOf('type')]?.trim();

      if (type !== 'text' || !text) continue;

      const sender = fromMe === '1' ? 'Você' : (mobile_number || 'Desconhecido');

      messages.push({
        timestamp: message_created || new Date().toISOString(),
        sender: sender,
        content: text,
        conversationId: chat_id || 'default',
        fromMe: fromMe === '1'
      });
    }
  }

  const conversationMap = new Map<string, any[]>();
  messages.forEach(msg => {
    const convId = msg.conversationId;
    if (!conversationMap.has(convId)) {
      conversationMap.set(convId, []);
    }
    conversationMap.get(convId)!.push(msg);
  });

  const conversations: Conversation[] = [];
  conversationMap.forEach((msgs, convId) => {
    const participants = [...new Set(msgs.map(m => m.sender))];
    const sortedMsgs = msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const lastMsg = sortedMsgs[sortedMsgs.length - 1];
    
    const phoneNumbers = participants.filter(p => p !== 'Você');
    const title = phoneNumbers.length > 0 
      ? `${phoneNumbers[0]} ${phoneNumbers.length > 1 ? `+${phoneNumbers.length - 1} outros` : ''}`
      : `Conversa ${convId}`;
    
    conversations.push({
      id: convId,
      title: title,
      participants,
      messageCount: msgs.length,
      lastMessage: lastMsg.content.substring(0, 50) + (lastMsg.content.length > 50 ? '...' : ''),
      lastTimestamp: lastMsg.timestamp,
      messages: sortedMsgs
    });
  });

  return conversations.sort((a, b) => new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime());
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}