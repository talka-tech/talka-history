export default async function handler(req: any, res: any) {
  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-id');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  console.log('🚀 Iniciando upload CSV simples...');

  try {
    // Pega o user ID do header
    const userId = req.headers['x-user-id'];
    if (!userId) {
      console.error('❌ User ID ausente');
      return res.status(400).json({ error: 'User ID obrigatório' });
    }

    // Pega o conteúdo CSV do body
    const csvContent = req.body;
    if (!csvContent || typeof csvContent !== 'string') {
      console.error('❌ Conteúdo CSV inválido');
      return res.status(400).json({ error: 'Conteúdo CSV inválido' });
    }

    console.log(`📊 Processando CSV - User: ${userId}, Tamanho: ${csvContent.length} chars`);

    // Configuração Supabase - debug das variáveis
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    console.log('🔍 Verificando configuração Supabase:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      urlStart: supabaseUrl ? supabaseUrl.substring(0, 20) + '...' : 'undefined',
      keyStart: supabaseKey ? supabaseKey.substring(0, 10) + '...' : 'undefined'
    });

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Configuração Supabase ausente:', {
        NEXT_PUBLIC_SUPABASE_URL: !!supabaseUrl,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: !!supabaseKey,
        allEnvVars: Object.keys(process.env).filter(key => key.includes('SUPABASE'))
      });
      return res.status(500).json({ 
        error: 'Configuração do banco inválida',
        debug: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey,
          envKeys: Object.keys(process.env).filter(key => key.includes('SUPABASE'))
        }
      });
    }

    // Processa o CSV
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      return res.status(400).json({ error: 'CSV vazio ou apenas com cabeçalho' });
    }

    console.log(`📋 Encontradas ${lines.length} linhas no CSV`);

    // Detecta headers
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
    console.log('🏷️ Headers detectados:', headers);

    // Mapeia índices das colunas importantes
    const columnMap = {
      chat_id: headers.findIndex(h => h.includes('chat_id')),
      mobile_number: headers.findIndex(h => h.includes('mobile_number') || h.includes('number')),
      fromMe: headers.findIndex(h => h.includes('fromme')),
      text: headers.findIndex(h => h.includes('text') || h.includes('message')),
      timestamp: headers.findIndex(h => h.includes('created') || h.includes('timestamp') || h.includes('date')),
      type: headers.findIndex(h => h.includes('type'))
    };

    console.log('🗂️ Mapeamento de colunas:', columnMap);

    // Debug: Mostra primeira linha de dados para análise
    if (lines.length > 1) {
      const firstDataLine = parseCSVLine(lines[1]);
      console.log('🔍 Primeira linha de dados (exemplo):', firstDataLine);
      console.log('🎯 Valores extraídos:');
      console.log('  - chat_id:', firstDataLine[columnMap.chat_id]);
      console.log('  - text:', firstDataLine[columnMap.text]);
      console.log('  - type:', firstDataLine[columnMap.type]);
      console.log('  - mobile_number:', firstDataLine[columnMap.mobile_number]);
      console.log('  - fromMe:', firstDataLine[columnMap.fromMe]);
      console.log('  - timestamp:', firstDataLine[columnMap.timestamp]);
    }

    // Valida se colunas essenciais existem
    if (columnMap.chat_id === -1 || columnMap.text === -1 || columnMap.type === -1) {
      return res.status(400).json({ 
        error: 'Colunas obrigatórias ausentes: chat_id, text, type',
        headers: headers
      });
    }

    // Processa mensagens
    const messages: any[] = [];
    let processedCount = 0;
    let errorCount = 0;

    for (let i = 1; i < lines.length; i++) {
      try {
        const line = lines[i].trim();
        if (!line) continue;

        // Parse da linha CSV (simples mas eficiente)
        const values = parseCSVLine(line);
        
        if (values.length < headers.length) {
          errorCount++;
          continue;
        }

        // Extrai dados
        const chat_id = values[columnMap.chat_id]?.trim()?.replace(/"/g, '') || 'unknown';
        const mobile_number = values[columnMap.mobile_number]?.trim()?.replace(/"/g, '') || '';
        const fromMe = values[columnMap.fromMe]?.trim()?.replace(/"/g, '') === '1';
        const text = values[columnMap.text]?.trim()?.replace(/"/g, '') || '';
        const timestamp = values[columnMap.timestamp]?.trim()?.replace(/"/g, '') || new Date().toISOString();
        const type = values[columnMap.type]?.trim()?.replace(/"/g, '')?.toLowerCase() || '';

        // Só processa mensagens de texto válidas
        if (type === 'text' && text && text.length > 0) {
          const sender = fromMe ? 'Você' : (mobile_number || 'Desconhecido');
          
          messages.push({
            conversation_id: chat_id, // Mapeia chat_id para conversation_id
            sender: sender,
            content: text,
            timestamp: timestamp,
            from_me: fromMe,
            user_id: parseInt(userId)
          });
          
          processedCount++;
        }

        // Log de progresso a cada 1000 linhas
        if (i % 1000 === 0) {
          console.log(`📈 Processadas ${i}/${lines.length} linhas - ${processedCount} mensagens válidas`);
        }

      } catch (lineError) {
        errorCount++;
        if (errorCount < 10) { // Só loga os primeiros 10 erros
          console.warn(`⚠️ Erro na linha ${i}:`, lineError.message);
        }
      }
    }

    console.log(`✅ Processamento concluído: ${processedCount} mensagens, ${errorCount} erros`);

    if (messages.length === 0) {
      return res.status(400).json({ error: 'Nenhuma mensagem válida encontrada no CSV' });
    }

    // ETAPA 1: Agrupar mensagens por chat_id e criar conversas
    console.log('📋 Agrupando mensagens por conversa...');
    const conversationGroups: { [chatId: string]: any[] } = {};
    
    messages.forEach((msg: any) => {
      const chatId = msg.conversation_id; // chat_id original do CSV
      if (!conversationGroups[chatId]) {
        conversationGroups[chatId] = [];
      }
      conversationGroups[chatId].push(msg);
    });

    const chatIds = Object.keys(conversationGroups);
    console.log(`� Encontradas ${chatIds.length} conversas distintas`);

    // ETAPA 2: Criar conversas na tabela conversations
    console.log('🏗️ Criando conversas no banco...');
    const conversationsToCreate = chatIds.map(chatId => {
      const msgs = conversationGroups[chatId];
      const participants = [...new Set(msgs.map((m: any) => m.sender))];
      const phoneNumbers = participants.filter(p => p !== 'Você');
      
      const title = phoneNumbers.length > 0 
        ? `${phoneNumbers[0]} ${phoneNumbers.length > 1 ? `+${phoneNumbers.length - 1} outros` : ''}`
        : `Conversa ${chatId}`;

      return {
        title: title,
        user_id: parseInt(userId)
      };
    });

    // Insere conversas
    const conversationsResponse = await fetch(`${supabaseUrl}/rest/v1/conversations`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(conversationsToCreate)
    });

    if (!conversationsResponse.ok) {
      const errorText = await conversationsResponse.text();
      console.error(`❌ Erro ao criar conversas:`, errorText);
      throw new Error(`Erro ao criar conversas: ${conversationsResponse.status} - ${errorText}`);
    }

    const createdConversations = await conversationsResponse.json();
    console.log(`✅ Criadas ${createdConversations.length} conversas`);

    // ETAPA 3: Mapear chat_id para conversation_id real
    const chatIdToConversationId: { [chatId: string]: number } = {};
    chatIds.forEach((chatId, index) => {
      chatIdToConversationId[chatId] = createdConversations[index].id;
    });

    // ETAPA 4: Preparar mensagens com conversation_id correto
    console.log('📝 Preparando mensagens para inserção...');
    const messagesForDatabase = messages.map((msg: any) => ({
      conversation_id: chatIdToConversationId[msg.conversation_id], // ID real da conversa
      timestamp: msg.timestamp,
      sender: msg.sender,
      content: msg.content,
      fromMe: msg.from_me
    }));

    // ETAPA 5: Salvar mensagens em batches
    console.log('💾 Salvando mensagens no banco...');
    const BATCH_SIZE = 1000;
    let savedCount = 0;

    for (let i = 0; i < messagesForDatabase.length; i += BATCH_SIZE) {
      const batch = messagesForDatabase.slice(i, i + BATCH_SIZE);
      
      console.log(`💾 Salvando batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(messagesForDatabase.length/BATCH_SIZE)} (${batch.length} mensagens)`);

      const response = await fetch(`${supabaseUrl}/rest/v1/messages`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(batch)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Erro ao salvar batch:`, errorText);
        throw new Error(`Erro ao salvar no banco: ${response.status} - ${errorText}`);
      }

      savedCount += batch.length;
      console.log(`✅ Batch salvo: ${savedCount}/${messagesForDatabase.length} mensagens`);
    }

    console.log('🎉 Upload concluído com sucesso!');

    // Resposta final
    return res.status(200).json({
      success: true,
      processed: createdConversations.length,
      totalMessages: savedCount,
      errorLines: errorCount,
      conversations: createdConversations.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erro no upload:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
}

// Função auxiliar para parse de CSV
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Aspas duplas dentro de aspas
        current += '"';
        i += 2;
      } else {
        // Toggle aspas
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === ',' && !inQuotes) {
      // Fim do campo
      result.push(current);
      current = '';
      i++;
    } else {
      // Caractere normal
      current += char;
      i++;
    }
  }
  
  // Adiciona o último campo
  result.push(current);
  return result;
}
