import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configuração sem Edge Runtime para suportar arquivos maiores
export const config = {
  maxDuration: 300, // 5 minutos
  api: {
    bodyParser: {
      sizeLimit: '50mb', // Aumentar limite para 50MB
    },
    responseLimit: false,
  },
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
    
    // Para arquivos grandes, processar de forma mais otimizada
    const conversations = parseCSVToConversations(csvText);
    
    if (conversations.length === 0) {
      return new Response(JSON.stringify({ error: 'No valid conversations found in CSV' }), {
        status: 400, 
        headers,
      });
    }

    console.log(`Found ${conversations.length} conversations to process`);

    // Para CSVs grandes, processar uma conversa por vez com feedback
    let totalProcessed = 0;
    let totalMessages = 0;

    for (const convo of conversations) {
      try {
        console.log(`Processing conversation: ${convo.title} with ${convo.messages.length} messages`);
        
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

        // Inserir mensagens em batches muito pequenos para evitar timeout
        const messageBatchSize = 20; // Apenas 20 mensagens por vez
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
          } else {
            totalMessages += messageBatch.length;
          }

          // Pequena pausa para não sobrecarregar
          if (j > 0 && j % 100 === 0) {
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }

        totalProcessed++;
        console.log(`✓ Processed conversation ${totalProcessed}/${conversations.length}: ${convo.title} (${convo.messages.length} messages)`);
        
      } catch (convError) {
        console.error(`Error processing conversation ${convo.id}:`, convError);
        continue;
      }
    }
    
    return new Response(JSON.stringify({ 
      message: `Upload concluído com sucesso!`,
      total: conversations.length,
      processed: totalProcessed,
      totalMessages: totalMessages
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

// --- Funções de Parsing Otimizadas ---
function parseCSVToConversations(csvText: string): Conversation[] {
  console.log('Starting CSV parsing...');
  
  const lines = csvText.split('\n');
  if (lines.length === 0) return [];
  
  // Processar header
  const headers = lines[0].split(',').map(h => h.trim());
  console.log('CSV Headers:', headers);
  
  // Índices das colunas importantes
  const chatIdIndex = headers.indexOf('chat_id');
  const mobileNumberIndex = headers.indexOf('mobile_number');
  const fromMeIndex = headers.indexOf('fromMe');
  const textIndex = headers.indexOf('text');
  const messageCreatedIndex = headers.indexOf('message_created');
  const typeIndex = headers.indexOf('type');
  
  if (chatIdIndex === -1 || textIndex === -1) {
    throw new Error('CSV format invalid. Required columns: chat_id, text');
  }

  // Processar mensagens linha por linha para evitar sobrecarga de memória
  const conversationMap = new Map<string, any[]>();
  let processedLines = 0;
  let validMessages = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    processedLines++;
    if (processedLines % 1000 === 0) {
      console.log(`Processed ${processedLines} lines, found ${validMessages} valid messages`);
    }
    
    try {
      const values = parseCSVLine(line);
      
      if (values.length < headers.length) continue;
      
      const chat_id = values[chatIdIndex]?.trim();
      const mobile_number = values[mobileNumberIndex]?.trim();
      const fromMe = values[fromMeIndex]?.trim();
      const text = values[textIndex]?.trim();
      const message_created = values[messageCreatedIndex]?.trim();
      const type = values[typeIndex]?.trim();

      // Filtrar apenas mensagens de texto válidas
      if (type !== 'text' || !text || !chat_id) continue;

      const sender = fromMe === '1' ? 'Você' : (mobile_number || 'Desconhecido');

      const message = {
        timestamp: message_created || new Date().toISOString(),
        sender: sender,
        content: text.substring(0, 1000), // Limitar tamanho da mensagem
        conversationId: chat_id,
        fromMe: fromMe === '1'
      };

      // Adicionar à conversa correspondente
      if (!conversationMap.has(chat_id)) {
        conversationMap.set(chat_id, []);
      }
      conversationMap.get(chat_id)!.push(message);
      validMessages++;
      
    } catch (lineError) {
      console.warn(`Error parsing line ${i}:`, lineError);
      continue;
    }
  }

  console.log(`Parsing completed: ${validMessages} valid messages in ${conversationMap.size} conversations`);

  // Converter Map para array de conversas
  const conversations: Conversation[] = [];
  conversationMap.forEach((msgs, convId) => {
    if (msgs.length === 0) return;
    
    const participants = [...new Set(msgs.map(m => m.sender))];
    const sortedMsgs = msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const lastMsg = sortedMsgs[sortedMsgs.length - 1];
    
    const phoneNumbers = participants.filter(p => p !== 'Você');
    const title = phoneNumbers.length > 0 
      ? `${phoneNumbers[0]} ${phoneNumbers.length > 1 ? `+${phoneNumbers.length - 1} outros` : ''}`
      : `Conversa ${convId}`;
    
    conversations.push({
      id: convId,
      title: title.substring(0, 100), // Limitar tamanho do título
      participants,
      messageCount: msgs.length,
      lastMessage: lastMsg.content.substring(0, 50) + (lastMsg.content.length > 50 ? '...' : ''),
      lastTimestamp: lastMsg.timestamp,
      messages: sortedMsgs
    });
  });

  // Limitar número de conversas e ordenar por data
  const sortedConversations = conversations
    .sort((a, b) => new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime())
    .slice(0, 50); // Limitar a 50 conversas mais recentes para evitar sobrecarga

  console.log(`Returning ${sortedConversations.length} conversations`);
  return sortedConversations;
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