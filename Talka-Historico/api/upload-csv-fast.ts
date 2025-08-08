export default async function handler(request: Request): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
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

  console.log('🚀 Fast chunk processing started');

  try {
    // Parse JSON body
    const body = await request.json();
    const { chunk, chunkIndex, totalChunks, isLastChunk, userId } = body;

    console.log(`📦 Processing chunk ${chunkIndex + 1}/${totalChunks} (${chunk?.length || 0} chars)`);

    // Validação básica
    if (!userId || chunk === undefined) {
      return new Response(JSON.stringify({ error: 'Dados inválidos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Configuração Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Supabase config missing');
      return new Response(JSON.stringify({ error: 'Configuração do banco inválida' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Processamento rápido do CSV
    let processedMessages = 0;
    
    if (chunk && chunk.trim()) {
      console.log('🔄 Processing CSV lines...');
      
      const lines = chunk.split('\n').filter(line => line.trim());
      console.log(`📊 Found ${lines.length} lines to process`);
      
      // Se é o primeiro chunk, detecta headers
      const isFirstChunk = chunkIndex === 0;
      let startIndex = 0;
      
      if (isFirstChunk && lines.length > 0) {
        // Pula header no primeiro chunk
        const firstLine = lines[0].toLowerCase();
        if (firstLine.includes('chat_id') || firstLine.includes('text') || firstLine.includes('type')) {
          startIndex = 1;
          console.log('📋 Header detected, skipping first line');
        }
      }

      // Processa linhas em batch para velocidade
      const messages: any[] = [];
      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        try {
          // Parse rápido da linha CSV
          const values = parseCSVLine(line);
          
          if (values.length >= 6) { // Pelo menos 6 colunas esperadas
            const [chat_id, mobile_number, fromMe, text, message_created, type] = values;
            
            // Só processa mensagens de texto
            if (type?.toLowerCase() === 'text' && text?.trim()) {
              messages.push({
                chat_id: chat_id?.trim() || 'unknown',
                sender: fromMe === '1' ? 'Você' : (mobile_number?.trim() || 'Desconhecido'),
                content: text.trim(),
                timestamp: message_created?.trim() || new Date().toISOString(),
                from_me: fromMe === '1',
                user_id: userId
              });
            }
          }
        } catch (lineError) {
          console.warn(`⚠️ Error parsing line ${i}:`, lineError.message);
        }
      }

      processedMessages = messages.length;
      console.log(`✅ Processed ${processedMessages} messages from chunk`);

      // Salva no Supabase em batch
      if (messages.length > 0) {
        console.log('💾 Saving to database...');
        
        const response = await fetch(`${supabaseUrl}/rest/v1/messages`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(messages)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Database save failed:', errorText);
          throw new Error(`Erro ao salvar no banco: ${response.status}`);
        }

        console.log('✅ Database save successful');
      }
    }

    // Resposta otimizada
    const result: any = {
      success: true,
      chunkIndex: chunkIndex + 1,
      totalChunks,
      processedMessages,
      isLastChunk
    };

    if (isLastChunk) {
      console.log('🎉 Last chunk processed successfully');
      result.totalProcessed = `${processedMessages} no último chunk`;
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Chunk processing error:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Erro no processamento do chunk',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Função auxiliar para parse rápido de CSV
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
