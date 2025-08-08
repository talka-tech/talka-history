export default async function handler(request: Request): Promise<Response> {
  // Headers CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-user-id',
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

  console.log('🚀 Iniciando upload CSV - SEM LIMITES');

  try {
    // 1. Validar User ID
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('👤 User ID:', userId);

    // 2. Ler arquivo - SEM LIMITE DE TAMANHO
    let csvContent: string;
    try {
      csvContent = await request.text();
      const sizeMB = csvContent.length / (1024 * 1024);
      console.log('📊 Arquivo lido:', sizeMB.toFixed(2), 'MB');
    } catch (error) {
      console.error('❌ Erro ao ler arquivo:', error);
      return new Response(JSON.stringify({ error: 'Erro ao ler arquivo' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!csvContent.trim()) {
      return new Response(JSON.stringify({ error: 'Arquivo vazio' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 3. Parse do CSV - TODAS AS LINHAS
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      return new Response(JSON.stringify({ error: 'CSV precisa ter header + dados' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('📄 Total de linhas:', lines.length);
    const dataLines = lines.slice(1); // Remove header
    console.log('📄 Linhas de dados:', dataLines.length);

    // 4. Configurar Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Supabase não configurado');
      return new Response(JSON.stringify({ error: 'Banco de dados não configurado' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Supabase configurado - processando TODAS as mensagens');

    // 5. Processar TODAS as mensagens em lotes otimizados
    const batchSize = 100; // Lotes maiores para eficiência
    let totalProcessed = 0;
    let totalErrors = 0;
    const conversations: { [key: string]: number } = {};
    const errors: string[] = [];

    console.log(`🔄 Processando ${dataLines.length} mensagens em lotes de ${batchSize}`);

    // Loop principal - processa TUDO
    for (let i = 0; i < dataLines.length; i += batchSize) {
      const batch = dataLines.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(dataLines.length / batchSize);
      
      console.log(`📦 Lote ${batchNumber}/${totalBatches} - ${batch.length} linhas`);
      
      const batchData: any[] = [];
      
      // Processar cada linha do lote
      for (let j = 0; j < batch.length; j++) {
        const line = batch[j];
        try {
          // Parse robusto da linha CSV
          const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
          
          if (cols.length < 3) {
            totalErrors++;
            continue;
          }
          
          // Mapear campos do WhatsApp CSV
          const chatId = cols[0] || `chat_${Date.now()}_${j}`;
          const mobileNumber = cols[1] || '';
          const chatCreated = cols[2] || '';
          const messageId = cols[3] || '';
          const fromMe = cols[4]?.toLowerCase() === 'true';
          const type = cols[5] || 'text';
          const direction = cols[6] || '';
          const text = cols[7] || '';
          const media = cols[8] || '';
          const communicationMode = cols[9] || '';
          const messageCreated = cols[10] || '';
          
          // Garantir que temos dados essenciais
          if (!chatId || (!text && type === 'text')) {
            totalErrors++;
            continue;
          }
          
          // Contar mensagens por conversa
          conversations[chatId] = (conversations[chatId] || 0) + 1;
          
          // Preparar dados para inserção
          batchData.push({
            user_id: parseInt(userId),
            chat_id: chatId,
            message_id: messageId || `msg_${Date.now()}_${j}`,
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
              line_number: i + j + 2, // +2 para contar header
              batch_number: batchNumber,
              original_columns: cols.length
            }
          });
          
        } catch (parseError) {
          console.warn(`⚠️ Erro linha ${i + j + 2}:`, parseError.message);
          totalErrors++;
          errors.push(`Linha ${i + j + 2}: ${parseError.message}`);
        }
      }
      
      // Salvar lote no Supabase - COM RETRY em caso de erro
      if (batchData.length > 0) {
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount <= maxRetries) {
          try {
            console.log(`💾 Salvando lote ${batchNumber}: ${batchData.length} mensagens (tentativa ${retryCount + 1})`);
            
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
              console.error(`❌ Erro Supabase ${response.status}:`, errorText.substring(0, 200));
              
              if (retryCount === maxRetries) {
                // Se esgotaram as tentativas, salvar o erro mas continuar
                errors.push(`Lote ${batchNumber}: Erro ${response.status} após ${maxRetries + 1} tentativas`);
                totalErrors += batchData.length;
                break;
              } else {
                // Retry com delay
                await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
                retryCount++;
                continue;
              }
            }
            
            // Sucesso!
            totalProcessed += batchData.length;
            console.log(`✅ Lote ${batchNumber} salvo com sucesso! Total: ${totalProcessed}/${dataLines.length}`);
            break;
            
          } catch (networkError) {
            console.error(`❌ Erro de rede lote ${batchNumber}:`, networkError.message);
            
            if (retryCount === maxRetries) {
              errors.push(`Lote ${batchNumber}: Erro de rede após ${maxRetries + 1} tentativas`);
              totalErrors += batchData.length;
              break;
            } else {
              await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
              retryCount++;
            }
          }
        }
      }
      
      // Log de progresso a cada 10 lotes
      if (batchNumber % 10 === 0) {
        console.log(`📊 Progresso: ${totalProcessed}/${dataLines.length} mensagens processadas`);
      }
    }

    // 6. Salvar informações das conversas
    console.log('💬 Salvando informações das conversas...');
    if (Object.keys(conversations).length > 0) {
      try {
        const conversationData = Object.entries(conversations).map(([chatId, messageCount]) => ({
          user_id: parseInt(userId),
          chat_id: chatId,
          message_count: messageCount,
          last_message_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        }));

        // Salvar conversas em lotes também
        const convBatchSize = 50;
        for (let i = 0; i < conversationData.length; i += convBatchSize) {
          const convBatch = conversationData.slice(i, i + convBatchSize);
          
          const response = await fetch(`${supabaseUrl}/rest/v1/conversations`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
              'apikey': supabaseKey,
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify(convBatch)
          });

          if (!response.ok) {
            console.warn('⚠️ Erro ao salvar conversas:', response.status);
          }
        }
        
        console.log(`✅ ${Object.keys(conversations).length} conversas salvas`);
      } catch (convError) {
        console.warn('⚠️ Erro ao salvar conversas:', convError.message);
      }
    }

    // 7. Resposta final com estatísticas completas
    const finalStats = {
      totalLines: dataLines.length,
      successfullyProcessed: totalProcessed,
      errors: totalErrors,
      successRate: ((totalProcessed / dataLines.length) * 100).toFixed(2) + '%',
      conversationsCount: Object.keys(conversations).length,
      fileSizeMB: (csvContent.length / (1024 * 1024)).toFixed(2),
      errorDetails: errors.slice(0, 10) // Primeiros 10 erros para debug
    };

    console.log('🎉 PROCESSAMENTO COMPLETO!');
    console.log('📊 Estatísticas:', finalStats);

    return new Response(JSON.stringify({
      success: true,
      message: `CSV processado com sucesso! ${totalProcessed}/${dataLines.length} mensagens importadas`,
      stats: finalStats
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 ERRO FATAL:', error);
    
    return new Response(JSON.stringify({
      error: 'Erro interno do servidor',
      message: error.message,
      details: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
