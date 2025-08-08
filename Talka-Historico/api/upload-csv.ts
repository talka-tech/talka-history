import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configuração sem Edge Runtime para suportar arquivos maiores
export const config = {
  maxDuration: 300, // 5 minutos
  api: {
    bodyParser: {
      sizeLimit: '100mb', // Aumentar limite drasticamente
    },
    responseLimit: '100mb',
    externalResolver: true,
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

export default async function handler(request: Request): Promise<Response> {
  // Log inicial detalhado
  console.log('🚀 Upload CSV API chamado:', {
    method: request.method,
    url: request.url,
    timestamp: new Date().toISOString()
  });

  // Headers de CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-user-id',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // Verificar user-id
    const userId = request.headers.get('x-user-id');
    console.log('👤 User ID recebido:', userId);
    
    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Ler o conteúdo do request
    console.log('📖 Lendo conteúdo do arquivo...');
    const csvContent = await request.text();
    console.log('📏 Tamanho do conteúdo:', csvContent.length, 'caracteres');
    
    if (!csvContent || csvContent.length === 0) {
      return new Response(JSON.stringify({ error: 'Arquivo CSV vazio' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verificar tamanho (Vercel limit é 4.5MB para payloads)
    const sizeMB = csvContent.length / (1024 * 1024);
    console.log('📊 Tamanho do arquivo:', sizeMB.toFixed(2), 'MB');
    
    if (sizeMB > 4.5) {
      console.log('❌ Arquivo muito grande para Vercel:', sizeMB.toFixed(2), 'MB');
      return new Response(JSON.stringify({ 
        error: 'Arquivo muito grande. Máximo permitido: 4.5MB',
        size: sizeMB.toFixed(2) + 'MB' 
      }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse do CSV line por line para economizar memória
    console.log('� Iniciando análise do CSV...');
    const lines = csvContent.split('\n').filter(line => line.trim());
    console.log('📄 Total de linhas:', lines.length);
    
    if (lines.length === 0) {
      return new Response(JSON.stringify({ error: 'Arquivo CSV sem conteúdo válido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const headers = lines[0].toLowerCase();
    console.log('📋 Headers detectados:', headers);
    
    // Validação de headers obrigatórios
    const requiredFields = ['chat_id', 'text', 'type'];
    const missingFields = requiredFields.filter(field => !headers.includes(field));
    
    if (missingFields.length > 0) {
      return new Response(JSON.stringify({ 
        error: `Campos obrigatórios ausentes: ${missingFields.join(', ')}`,
        received: headers 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Conectar ao Supabase
    console.log('🔗 Conectando ao Supabase...');
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('❌ Variáveis do Supabase não configuradas');
      return new Response(JSON.stringify({ error: 'Configuração do banco de dados não encontrada' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Supabase configurado, iniciando processamento...');
    
    // Processar dados em lotes menores para evitar timeout
    const dataLines = lines.slice(1); // Remove header
    const batchSize = 50; // Lotes menores para Vercel
    let processedMessages = 0;
    let conversationStats: { [key: string]: number } = {};

    console.log(`🔄 Processando ${dataLines.length} mensagens em lotes de ${batchSize}...`);

    // Processar em batches
    for (let i = 0; i < dataLines.length; i += batchSize) {
      const batch = dataLines.slice(i, i + batchSize);
      console.log(`📦 Processando lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(dataLines.length / batchSize)}`);
      
      const batchData: any[] = [];
      
      for (const line of batch) {
        if (!line.trim()) continue;
        
        try {
          // Parse simples de CSV (pode melhorar com biblioteca se necessário)
          const columns = line.split(',').map(col => col.replace(/"/g, '').trim());
          
          if (columns.length < 3) continue;
          
          const chatId = columns[0];
          const text = columns[7] || columns[1] || ''; // text pode estar em posições diferentes
          const type = columns[5] || columns[2] || 'text';
          
          if (!chatId || !text) continue;
          
          // Estatísticas
          if (!conversationStats[chatId]) {
            conversationStats[chatId] = 0;
          }
          conversationStats[chatId]++;
          
          batchData.push({
            user_id: parseInt(userId),
            chat_id: chatId,
            message_text: text.substring(0, 2000), // Limit text size
            message_type: type,
            created_at: new Date().toISOString(),
            metadata: {
              original_line: i + batchData.length + 1,
              batch: Math.floor(i / batchSize) + 1
            }
          });
          
        } catch (error) {
          console.log('⚠️ Erro ao processar linha:', error.message);
        }
      }
      
      // Salvar lote no Supabase
      if (batchData.length > 0) {
        try {
          const response = await fetch(`${supabaseUrl}/rest/v1/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
              'apikey': supabaseKey,
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify(batchData)
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.log('❌ Erro ao salvar lote no Supabase:', response.status, errorText);
            throw new Error(`Erro no Supabase: ${response.status}`);
          }
          
          processedMessages += batchData.length;
          console.log(`✅ Lote salvo: ${batchData.length} mensagens. Total: ${processedMessages}`);
          
        } catch (error) {
          console.log('❌ Erro ao salvar no Supabase:', error.message);
        }
      }
    }

    // Salvar estatísticas das conversas
    console.log('💾 Salvando estatísticas das conversas...');
    const conversationData = Object.entries(conversationStats).map(([chatId, messageCount]) => ({
      user_id: parseInt(userId),
      chat_id: chatId,
      message_count: messageCount,
      last_message_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    }));

    if (conversationData.length > 0) {
      try {
        const response = await fetch(`${supabaseUrl}/rest/v1/conversations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(conversationData)
        });

        if (!response.ok) {
          console.log('⚠️ Erro ao salvar conversas:', response.status);
        } else {
          console.log(`✅ ${conversationData.length} conversas salvas`);
        }
      } catch (error) {
        console.log('⚠️ Erro ao salvar conversas:', error.message);
      }
    }

    console.log('🎉 Upload concluído com sucesso!');
    console.log(`📊 Resumo: ${processedMessages} mensagens, ${Object.keys(conversationStats).length} conversas`);

    return new Response(JSON.stringify({
      success: true,
      message: 'CSV processado com sucesso',
      stats: {
        totalLines: dataLines.length,
        processedMessages: processedMessages,
        conversationsCount: Object.keys(conversationStats).length,
        fileSize: sizeMB.toFixed(2) + 'MB'
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Erro geral no processamento:', error);
    return new Response(JSON.stringify({
      error: 'Erro interno do servidor',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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