import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configuração sem Edge Runtime para suportar arquivos maiores
export const config = {
  maxDuration: 300, // 5 minutos
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
  // Headers CORS para permitir requisições
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-user-id',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405, 
      headers,
    });
  }

  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return new Response(JSON.stringify({ error: 'User ID is required' }), {
      status: 401, 
      headers,
    });
  }

  try {
    console.log(`Starting CSV processing for user ${userId}`);
    
    // Ler o conteúdo do arquivo com melhor tratamento de erro
    let csvText = '';
    try {
      csvText = await request.text();
    } catch (error) {
      console.error('Error reading request body:', error);
      return new Response(JSON.stringify({ error: 'Failed to read file content. File might be too large or corrupted.' }), {
        status: 400, 
        headers,
      });
    }
    
    if (!csvText || csvText.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Empty CSV file' }), {
        status: 400, 
        headers,
      });
    }

    console.log(`Processing CSV with ${csvText.length} characters for user ${userId}`);
    
    // Processar o CSV em batches menores para evitar timeout
    const conversations = parseCSVToConversations(csvText);
    
    if (conversations.length === 0) {
      return new Response(JSON.stringify({ error: 'No valid conversations found in CSV' }), {
        status: 400, 
        headers,
      });
    }

    console.log(`Found ${conversations.length} conversations to process`);

    // Processar em lotes menores para evitar timeout com arquivos grandes
    const batchSize = 3; // Reduzir para 3 conversas por vez
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