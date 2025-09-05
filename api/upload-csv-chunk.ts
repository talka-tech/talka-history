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

  console.log('🚀 Iniciando processamento de chunk CSV');

  try {
    console.log('🔍 Step 1: Parsing JSON body...');
    // Ler dados do body JSON
    const body = await request.json();
    console.log('✅ Step 1 OK: Body parsed');
    
    const { chunk, chunkIndex, totalChunks, isLastChunk, userId } = body;
    const uploadId = `upload_${userId}_${Date.now()}`;

    console.log('📦 Chunk info:', { 
      userId, 
      chunkIndex: chunkIndex + 1, 
      totalChunks, 
      isLastChunk,
      chunkSize: chunk?.length || 0
    });

    console.log('🔍 Step 2: Validating parameters...');
    if (!userId) {
      console.error('❌ User ID missing');
      return new Response(JSON.stringify({ error: 'User ID obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!chunk || !chunk.trim()) {
      console.error('❌ Chunk empty or invalid');
      return new Response(JSON.stringify({ error: 'Chunk vazio' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    console.log('✅ Step 2 OK: Parameters valid');

    console.log('📄 Chunk recebido:', chunk.length, 'caracteres');

    console.log('🔍 Step 3: Checking environment variables...');
    // Configurar Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Supabase environment variables missing:', { 
        hasUrl: !!supabaseUrl, 
        hasKey: !!supabaseKey 
      });
      return new Response(JSON.stringify({ error: 'Banco não configurado' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    console.log('✅ Step 3 OK: Environment variables present');

    console.log('🔍 Step 3.5: Testing Supabase connection...');
    try {
      // Teste simples de conexão
      const testResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        }
      });
      console.log('🔗 Supabase connection test:', testResponse.status);
    } catch (connError) {
      console.error('❌ Supabase connection failed:', connError.message);
      return new Response(JSON.stringify({ error: 'Falha de conexão com banco' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    console.log('✅ Step 3.5 OK: Supabase connection working');

    console.log('🔍 Step 4: Processing chunk lines...');
    // Processar linhas do chunk
    const lines = chunk.split('\n').filter(line => line.trim());
    console.log('📝 Linhas no chunk:', lines.length);

    // Se é o primeiro chunk, pular header
    const dataLines = (chunkIndex === 0 && lines[0]?.includes('chat_id')) ? lines.slice(1) : lines;
    console.log('📊 Linhas de dados:', dataLines.length);
    console.log('✅ Step 4 OK: Lines processed');

    if (dataLines.length === 0) {
      console.log('⚠️ No data lines found, returning empty result');
      return new Response(JSON.stringify({
        success: true,
        message: 'Chunk processado (sem dados)',
        processed: 0,
        chunkIndex,
        totalChunks
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Processar mensagens do chunk
    const messages: any[] = [];
    const conversations: { [key: string]: number } = {};
    let processed = 0;
    let errors = 0;

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i];
      try {
        const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
        
        if (cols.length < 3) {
          errors++;
          continue;
        }

        const chatId = cols[0] || `chat_${uploadId}_${chunkIndex}_${i}`;
        const mobileNumber = cols[1] || '';
        const chatCreated = cols[2] || '';
        const messageId = cols[3] || `msg_${uploadId}_${chunkIndex}_${i}`;
        const fromMe = cols[4]?.toLowerCase() === 'true';
        const type = cols[5] || 'text';
        const direction = cols[6] || '';
        const text = cols[7] || '';
        const media = cols[8] || '';
        const communicationMode = cols[9] || '';
        const messageCreated = cols[10] || '';

        if (!chatId) {
          errors++;
          continue;
        }

        conversations[chatId] = (conversations[chatId] || 0) + 1;

        messages.push({
          user_id: parseInt(userId),
          chat_id: chatId,
          message_id: messageId,
          mobile_number: mobileNumber,
          from_me: fromMe,
          message_type: type,
          direction: direction,
          message_text: text || `[${type}]`,
          media_url: media,
          communication_mode: communicationMode,
          message_created_at: messageCreated || new Date().toISOString(),
          chat_created_at: chatCreated || new Date().toISOString(),
          created_at: new Date().toISOString(),
          metadata: {
            upload_id: uploadId,
            chunk_index: chunkIndex,
            line_in_chunk: i + 1,
            total_chunks: totalChunks
          }
        });

        processed++;

      } catch (parseError) {
        console.warn(`⚠️ Erro linha ${i + 1}:`, parseError.message);
        errors++;
      }
    }

    console.log('📊 Processamento do chunk:', { processed, errors, conversations: Object.keys(conversations).length });

    // Salvar mensagens em lotes pequenos
    let saved = 0;
    const batchSize = 50; // Lotes bem pequenos para garantir

    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      
      try {
        const response = await fetch(`${supabaseUrl}/rest/v1/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(batch)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Erro Supabase:`, response.status, errorText.substring(0, 100));
          throw new Error(`Supabase error: ${response.status}`);
        }

        saved += batch.length;
        console.log(`✅ Lote salvo: ${batch.length} mensagens (total: ${saved})`);

      } catch (batchError) {
        console.error('❌ Erro ao salvar lote:', batchError.message);
        // Continua processando outros lotes
      }
    }

    // Se é o último chunk, salvar conversas
    if (chunkIndex === totalChunks - 1 && Object.keys(conversations).length > 0) {
      console.log('💬 Último chunk - salvando conversas...');
      
      try {
        const conversationData = Object.entries(conversations).map(([chatId, messageCount]) => ({
          user_id: parseInt(userId),
          chat_id: chatId,
          message_count: messageCount,
          upload_id: uploadId,
          last_message_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        }));

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

        if (response.ok) {
          console.log(`✅ ${conversationData.length} conversas salvas`);
        }
      } catch (convError) {
        console.warn('⚠️ Erro ao salvar conversas:', convError.message);
      }
    }

    // Resposta do chunk
    return new Response(JSON.stringify({
      success: true,
      message: isLastChunk ? 'Upload completo!' : `Chunk ${chunkIndex + 1}/${totalChunks} processado`,
      chunkStats: {
        chunkIndex,
        totalChunks,
        processed: saved,
        errors,
        conversations: Object.keys(conversations).length,
        isLastChunk
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Erro crítico no chunk processing:', {
      errorMessage: error.message,
      errorStack: error.stack,
      errorName: error.name,
      timestamp: new Date().toISOString()
    });
    
    return new Response(JSON.stringify({
      error: 'Erro no processamento do chunk',
      details: error.message,
      type: error.name,
      stack: error.stack?.split('\n')[0] // Primeira linha do stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
