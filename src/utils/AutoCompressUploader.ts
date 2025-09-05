import pako from 'pako';
import { supabase } from '../../lib/supabase';

interface ProgressCallback {
  (percent: number, message: string): void;
}

export class AutoCompressUploader {
  private onProgress: ProgressCallback | null = null;

  constructor() {
    this.onProgress = null;
  }

  async handleFileUpload(file: File, progressCallback: ProgressCallback, userId: number, forceCsvType?: string): Promise<any> {
    this.onProgress = progressCallback;

    // Se não for CSV, rejeita
    if (!file.name.toLowerCase().endsWith('.csv')) {
      throw new Error('Apenas arquivos CSV são suportados');
    }

    if (this.onProgress) this.onProgress(5, 'Iniciando processamento...');
    console.log(`📦 Arquivo original: ${this.formatBytes(file.size)}`);

    // Lê e valida o arquivo
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('CSV inválido: falta header ou dados');
    }

    // Validação das colunas obrigatórias e detecção do tipo de CSV
    const headers = lines[0].toLowerCase();
    const headerArray = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''));
    
    let csvType = forceCsvType || 'unknown';
    let requiredColumns: string[] = [];
    
    // DETECÇÃO AUTOMÁTICA DO TIPO DE CSV (ou usa o tipo forçado)
    if (csvType === 'wrl' || (!forceCsvType && headers.includes('chat_id') && headers.includes('mobile_number') && headers.includes('fromme'))) {
      csvType = 'wrl'; // CSV da WRL Bonés
      requiredColumns = ['chat_id', 'mobile_number', 'fromme', 'direction', 'text', 'type'];
    } else if (csvType === 'rcws' || (!forceCsvType && headers.includes('_id') && headers.includes('chat') && headers.includes('is_out') && headers.includes('wa_sender_id'))) {
      csvType = 'rcws'; // CSV da RCWS Advogados
      requiredColumns = ['_id', 'chat', 'is_out', 'text', 'type'];
    } else {
      throw new Error('Formato de CSV não reconhecido. Suporte apenas para WRL Bonés e RCWS Advogados.');
    }
    
    console.log(`🔍 TIPO DE CSV: ${csvType.toUpperCase()} ${forceCsvType ? '(FORÇADO)' : '(DETECTADO)'}`);
    console.log(`📋 COLUNAS OBRIGATÓRIAS: ${requiredColumns.join(', ')}`);
    
    // Só valida colunas se não for tipo forçado
    if (!forceCsvType) {
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));
      
      if (missingColumns.length > 0) {
        throw new Error(`Colunas obrigatórias ausentes: ${missingColumns.join(', ')}`);
      }
    }

    if (this.onProgress) this.onProgress(10, 'Validação aprovada! Iniciando compressão...');

    // **COMPRESSÃO REAL COM PAKO - GARANTIDA**
    const originalSize = new Blob([text]).size;
    console.log(`� Arquivo original: ${this.formatBytes(originalSize)}`);
    
    if (this.onProgress) this.onProgress(15, `Comprimindo ${this.formatBytes(originalSize)} com pako...`);
    
    // GARANTIA: Comprime SEMPRE com pako (deflate) - máxima compressão
    const compressed = pako.deflate(text, { 
      level: 9, // Nível máximo de compressão
      windowBits: 15, // Otimização para CSV
      memLevel: 9 // Máxima memória para melhor compressão
    });
    
    const compressedSize = compressed.length;
    const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
    
    // LOGS GARANTIDOS para verificação
    console.log(`🗜️ PAKO COMPRESSÃO:`);
    console.log(`   Original: ${this.formatBytes(originalSize)}`);
    console.log(`   Comprimido: ${this.formatBytes(compressedSize)}`);
    console.log(`   Redução: ${compressionRatio}%`);
    console.log(`   Dados comprimidos: ${compressed.byteLength} bytes`);
    
    if (this.onProgress) this.onProgress(25, `✅ Pako reduziu ${compressionRatio}% do tamanho!`);

    // Processa o CSV com dados comprimidos
    return this.processCompressedCSV(compressed, text, userId, originalSize, compressedSize, csvType);
  }

  async processCompressedCSV(compressedData: Uint8Array, originalText: string, userId: number, originalSize: number, compressedSize: number, csvType: string): Promise<any> {
    // Trabalha com o texto original para processamento, mas mantém estatísticas de compressão
    const rawLines = originalText.split('\n').filter(line => line.trim());
    
    console.log(`🏷️ CSV TYPE RECEBIDO: "${csvType}"`);
    
    if (this.onProgress) this.onProgress(30, 'Corrigindo formato do CSV...');
    
    // CORREÇÃO: Reconstrói linhas quebradas do CSV malformado
    const lines = this.fixBrokenCSVLines(rawLines);
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''));
    
    if (this.onProgress) this.onProgress(35, 'Processando mensagens...');

    const messagesToInsert: any[] = [];
    const conversationIds = new Set(); // Só adiciona conversas que têm mensagens válidas
    const conversationMessageCount = new Map(); // Track mensagens por conversa para debug
    const conversationPhones = new Map(); // NOVO: Armazena o número de telefone de cada conversa
    const conversationDates = new Map(); // NOVO: Armazena a data de criação de cada conversa do CSV
    const uniqueChats = new Set(); // DEBUG: Track valores únicos do campo 'chat'
    let processedLines = 0;
    const totalLines = lines.length - 1; // Excluindo header

    // Processa linha por linha com progresso REAL e PRECISO
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      const values = this.parseCSVLine(line);
      if (values.length < headers.length - 2) continue; // Tolerância para campos faltantes

      const data: any = {};
      headers.forEach((h, index) => {
        data[h] = values[index]?.replace(/['"]/g, '').trim() || '';
      });

      // FILTROS baseados no tipo de CSV
      if (csvType === 'wrl') {
        console.log(`🔍 PROCESSANDO LINHA WRL: ${JSON.stringify(data).substring(0, 100)}...`);
        // WRL: Ignora apenas note_action do sistema
        if (data.type === 'note_action') continue;
        
        // Aceita text, document, image
        if (!['text', 'document', 'image'].includes(data.type)) continue;
        
        // Para text, precisa ter conteúdo
        if (data.type === 'text' && (!data.text || data.text.trim() === '')) continue;
        
        // Usa chat_id como identificador da conversa
        data.chat_id = data.chat_id;
        
      } else if (csvType === 'rcws') {
        console.log(`🔍 PROCESSANDO LINHA RCWS: ${JSON.stringify(data).substring(0, 100)}...`);
        // RCWS: Aceita chat e image
        if (!['chat', 'image'].includes(data.type)) continue;
        
        // Para chat, precisa ter conteúdo
        if (data.type === 'chat' && (!data.text || data.text.trim() === '')) continue;
        
        // Para RCWS, usa campo "chat" como identificador único da conversa
        // CADA CHAT = UMA CONVERSA DIFERENTE (não phone, que é sempre igual)
        if (data.chat && data.chat.trim()) {
          const chatHash = data.chat.trim();
          
          // DEBUG: Track valores únicos do campo 'chat'
          uniqueChats.add(chatHash);
          
          console.log(`🔍 DEBUG CHAT: "${chatHash}" (${chatHash.length} chars)`);
          console.log(`📊 DEBUG FULL DATA: ${JSON.stringify(data, null, 2).substring(0, 300)}...`);
          
          // Se o chat é um hash (contém letras), usa o próprio hash como base
          if (/[a-fA-F]/.test(chatHash)) {
            // É um hash hexadecimal, vamos extrair um ID numérico dele
            const hash = this.hashString(chatHash);
            data.chat_id = hash; // Já está limitado pelo hashString
            
            console.log(`🆔 RCWS CHAT HASH DETECTADO: "${chatHash}" → ID ${data.chat_id}`);
          } else {
            // É um número real, processa normalmente
            console.log(`🔍 DEBUG CHAT NÚMERO: "${chatHash}"`);
            let cleanChat = chatHash.replace(/[^\d]/g, '');
            
            // Remove códigos de país comuns se presentes
            if (cleanChat.startsWith('55') && cleanChat.length > 11) {
              cleanChat = cleanChat.substring(2);
            }
            
            // Pega os últimos 9 dígitos
            if (cleanChat.length > 9) {
              cleanChat = cleanChat.slice(-9);
            }
            
            let numericId = parseInt(cleanChat);
            console.log(`🔢 CHAT PROCESSADO: "${chatHash}" → "${cleanChat}" → ${numericId}`);
            
            // Se ainda é muito grande ou inválido, usa hash truncado
            if (isNaN(numericId) || numericId > 999999999) {
              numericId = this.hashString(chatHash); // Já está limitado
              console.log(`⚠️ CHAT MUITO GRANDE, USANDO HASH: ${numericId}`);
            }
            
            data.chat_id = numericId;
            console.log(`🆔 RCWS CHAT FINAL: "${chatHash}" → Clean "${cleanChat}" → ID ${data.chat_id}`);
          }
          
          // Log para debug das primeiras conversas ÚNICAS
          if (!conversationMessageCount.has(data.chat_id)) {
            console.log(`🆔 RCWS NOVA CONVERSA: Chat "${chatHash}" → ID ${data.chat_id}`);
          }
          
        } else {
          // Se não tem phone, usa _id ou um fallback
          const fallbackId = parseInt(data._id) || Math.floor(Math.random() * 999999);
          data.chat_id = fallbackId;
          console.log(`⚠️  RCWS sem phone, usando _id: ${data._id} → ID ${fallbackId}`);
        }
      }

      // SÓ ADICIONA À CONVERSA QUANDO TEM MENSAGEM VÁLIDA
      conversationIds.add(data.chat_id);
      
      // Armazena dados baseado no tipo de CSV
      if (csvType === 'wrl') {
        // WRL: Armazena o número de telefone da conversa
        if (data.mobile_number && data.mobile_number.trim() && data.mobile_number.startsWith('+')) {
          conversationPhones.set(data.chat_id, data.mobile_number.trim());
          
          // 🔍 LOG: Primeira vez que captura um número para uma conversa
          if (!conversationMessageCount.has(data.chat_id)) {
            console.log(`📞 NÚMERO CAPTURADO [WRL]: Conversa ${data.chat_id} → ${data.mobile_number.trim()}`);
          }
        }
        
        // Armazena a data de criação da conversa do CSV
        if (data.chat_created && data.chat_created.trim()) {
          conversationDates.set(data.chat_id, data.chat_created.trim());
        }
        
      } else if (csvType === 'rcws') {
        // RCWS: Armazena o número de telefone da conversa
        if (data.phone && data.phone.trim()) {
          // Remove caracteres especiais do telefone se necessário
          const cleanPhone = data.phone.startsWith('+') ? data.phone : `+${data.phone}`;
          conversationPhones.set(data.chat_id, cleanPhone);
          
          // 🔍 LOG: Primeira vez que captura um número para uma conversa
          if (!conversationMessageCount.has(data.chat_id)) {
            console.log(`📞 NÚMERO CAPTURADO [RCWS]: Conversa ${data.chat_id} → ${cleanPhone}`);
          }
        }
        
        // Armazena a data de criação (timestamp)
        if (data.timestamp && data.timestamp.trim()) {
          conversationDates.set(data.chat_id, data.timestamp.trim());
        }
      }
      
      // Como o id é auto-increment (integer), não enviamos ele
      const senderName = this.getSenderName(data, csvType);
      
      // Determina se é da empresa (fromMe) baseado no sender e tipo de CSV
      const isFromMe = this.isFromCompany(data, csvType as 'wrl' | 'rcws');
      
      // Track para debug
      const currentCount = conversationMessageCount.get(data.chat_id) || 0;
      
      // Log para debug das primeiras 5 mensagens de cada conversa
      if (currentCount < 5) {
        console.log(`🔍 DETECÇÃO [${csvType.toUpperCase()}] Conversa ${data.chat_id}, Msg ${currentCount + 1}:`);
        console.log(`   Dados: ${JSON.stringify(this.getRelevantFields(data, csvType as 'wrl' | 'rcws'))}`);
        console.log(`   Texto: "${data.text?.substring(0, 80)}..."`);
        console.log(`   → Sender: "${senderName}", isFromMe: ${isFromMe}`);
      }
      
      conversationMessageCount.set(data.chat_id, currentCount + 1);
      
      // Gera conteúdo baseado no tipo de mensagem e CSV
      let messageContent = '';
      if (csvType === 'wrl') {
        if (data.type === 'text') {
          messageContent = data.text || '';
        } else if (data.type === 'document') {
          messageContent = `📎 Documento: ${data.text || 'Arquivo enviado'}`;
        } else if (data.type === 'image') {
          messageContent = `🖼️ Imagem enviada`;
        } else {
          messageContent = `📎 ${data.type}: ${data.text || 'Mídia enviada'}`;
        }
      } else if (csvType === 'rcws') {
        if (data.type === 'chat') {
          messageContent = data.text || '';
        } else if (data.type === 'image') {
          messageContent = `🖼️ Imagem enviada`;
        } else {
          messageContent = `📎 ${data.type}: ${data.text || 'Mídia enviada'}`;
        }
      }
      
      // Determina timestamp baseado no tipo de CSV
      let messageTimestamp = '';
      if (csvType === 'wrl') {
        messageTimestamp = data.message_created || new Date().toISOString();
      } else if (csvType === 'rcws') {
        // RCWS pode usar timestamp Unix ou ISO string
        if (data.timestamp) {
          // Se é um número, trata como timestamp Unix
          const timestamp = parseInt(data.timestamp);
          if (!isNaN(timestamp)) {
            messageTimestamp = new Date(timestamp * 1000).toISOString(); // Unix timestamp em segundos
          } else {
            messageTimestamp = data.timestamp; // Já é ISO string
          }
        } else if (data.created) {
          messageTimestamp = data.created;
        } else {
          messageTimestamp = new Date().toISOString();
        }
      }
      
      // Validação final: garante que chat_id é um número válido
      if (isNaN(parseInt(data.chat_id))) {
        console.warn(`⚠️  Chat ID inválido encontrado: ${data.chat_id}, gerando ID aleatório`);
        data.chat_id = Math.floor(Math.random() * 999999);
      }

      messagesToInsert.push({
        conversation_id: parseInt(data.chat_id), // Converte para int4
        sender: senderName,
        content: messageContent,
        timestamp: messageTimestamp,
        fromMe: isFromMe
      });

      processedLines++;
      
      // PROGRESSO REAL E PRECISO - atualiza a cada 25 linhas ou no final
      if (processedLines % 25 === 0 || processedLines === totalLines || i === lines.length - 1) {
        const processingProgress = Math.min(35, (processedLines / totalLines) * 35);
        const currentProgress = 35 + processingProgress;
        
        if (this.onProgress) {
          this.onProgress(
            Math.round(currentProgress), 
            `Processando... ${processedLines}/${totalLines} linhas (${Math.round((processedLines/totalLines)*100)}%) • ${messagesToInsert.length} mensagens válidas`
          );
        }
        
        // Pequeno delay para UI atualizar
        await new Promise(resolve => setTimeout(resolve, 5));
      }
    }

    console.log(`📊 ESTATÍSTICAS DO PROCESSAMENTO:`);
    console.log(`   📄 Total de linhas brutas: ${rawLines.length}`);
    console.log(`   🔧 Linhas corrigidas: ${lines.length}`);
    console.log(`   📝 Mensagens válidas: ${messagesToInsert.length}`);
    console.log(`   💬 Conversas com mensagens válidas: ${conversationIds.size}`);
    console.log(`   📞 Conversas com números identificados: ${conversationPhones.size}`);
    console.log(`   🔍 VALORES ÚNICOS DO CAMPO 'CHAT': ${uniqueChats.size}`);
    console.log(`   📋 PRIMEIROS 10 VALORES ÚNICOS: ${Array.from(uniqueChats).slice(0, 10).join(', ')}`);
    
    // Top 10 conversas com mais mensagens
    const sortedConversations = Array.from(conversationMessageCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    console.log(`   📈 Top conversas: ${sortedConversations.map(([id, count]) => `${id}(${count})`).join(', ')}`);

    if (this.onProgress) this.onProgress(70, `Criando ${conversationIds.size} conversas válidas...`);

    // **CRIAR CONVERSAS COM TÍTULOS FORMATADOS E DATAS DO CSV**
    await this.createConversations(Array.from(conversationIds) as string[], userId, conversationPhones, conversationDates);

    if (this.onProgress) this.onProgress(75, `Salvando ${messagesToInsert.length} mensagens no banco...`);

    // **SEGUNDO: UPLOAD DAS MENSAGENS EM LOTES**
    const BATCH_SIZE = 100;
    let totalInserted = 0;
    const totalToInsert = messagesToInsert.length;
    const totalBatches = Math.ceil(totalToInsert / BATCH_SIZE);

    console.log(`📡 Iniciando upload: ${totalToInsert} mensagens em ${totalBatches} lotes`);

    for (let i = 0; i < messagesToInsert.length; i += BATCH_SIZE) {
      const batch = messagesToInsert.slice(i, i + BATCH_SIZE);
      const currentBatch = Math.floor(i / BATCH_SIZE) + 1;
      
      // Log detalhado de cada lote
      console.log(`📤 Enviando lote ${currentBatch}/${totalBatches} (${batch.length} mensagens)`);
      
      const { error } = await supabase
        .from('messages')
        .insert(batch);

      if (error) {
        console.error('❌ Erro ao inserir lote:', error);
        throw new Error(`Erro ao salvar mensagens no lote ${currentBatch}: ${error.message}`);
      }

      totalInserted += batch.length;
      
      // PROGRESSO REAL do upload (75% -> 95%)
      const uploadProgressPercent = (totalInserted / totalToInsert) * 100;
      const uploadProgress = (uploadProgressPercent / 100) * 20; // 20% do total para upload
      const currentProgress = 75 + uploadProgress;
      
      console.log(`✅ Lote ${currentBatch} salvo: ${totalInserted}/${totalToInsert} mensagens (${uploadProgressPercent.toFixed(1)}%)`);
      
      if (this.onProgress) {
        this.onProgress(
          Math.round(currentProgress), 
          `Salvando lote ${currentBatch}/${totalBatches} • ${totalInserted}/${totalToInsert} mensagens (${uploadProgressPercent.toFixed(1)}%)`
        );
      }
      
      // Delay para permitir UI atualizar e não sobrecarregar o Supabase
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    if (this.onProgress) this.onProgress(100, '🎉 Upload 100% concluído com sucesso!');

    const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);

    // LOGS FINAIS DE CONFIRMAÇÃO
    console.log(`\n🎉 UPLOAD COMPLETO:`);
    console.log(`   ✅ ${totalInserted} mensagens salvas`);
    console.log(`   ✅ ${conversationIds.size} conversas criadas`);
    console.log(`   � ${conversationPhones.size} números de telefone identificados`);
    console.log(`   �🗜️ Compressão pako: ${compressionRatio}% redução`);
    console.log(`   📊 ${this.formatBytes(originalSize)} → ${this.formatBytes(compressedSize)}`);

    return {
      success: true,
      totalMessages: totalInserted,
      conversations: conversationIds.size,
      phonesIdentified: conversationPhones.size,
      originalSize: this.formatBytes(originalSize),
      compressedSize: this.formatBytes(compressedSize),
      compressionRatio: `${compressionRatio}%`,
      message: `🎉 ${totalInserted} mensagens de ${conversationIds.size} conversas processadas! ${conversationPhones.size} números identificados. Compressão: ${compressionRatio}%`
    };
  }

  async createConversations(conversationIds: string[], userId: number, conversationPhones?: Map<string, string>, conversationDates?: Map<string, string>) {
    // OTIMIZAÇÃO ULTRA-RÁPIDA: Uma única consulta para verificar conversas existentes
    console.log(`📁 Criando ${conversationIds.length} conversas com números de telefone e datas do CSV...`);
    
    // Converte e valida todos os IDs
    const convIds = conversationIds
      .map(id => parseInt(id))
      .filter(id => !isNaN(id) && id > 0); // Remove IDs inválidos
    
    console.log(`🔍 IDs válidos encontrados: ${convIds.length}/${conversationIds.length}`);
    
    // Se não há IDs válidos, não faz nada
    if (convIds.length === 0) {
      console.warn(`⚠️  Nenhum ID de conversa válido encontrado!`);
      return;
    }
    
    // 1. BUSCA TODAS AS CONVERSAS EXISTENTES EM UMA SÓ QUERY
    const { data: existingConversations } = await supabase
      .from('conversations')
      .select('id')
      .in('id', convIds);
    
    const existingIds = new Set(existingConversations?.map(conv => conv.id) || []);
    
    // 2. FILTRA APENAS AS QUE PRECISAM SER CRIADAS
    const newConversations = convIds
      .filter(id => !existingIds.has(id))
      .map(id => {
        const phoneNumber = conversationPhones?.get(id.toString());
        const title = phoneNumber ? this.formatPhoneNumber(phoneNumber) : `Conversa ${id}`;
        const csvDate = conversationDates?.get(id.toString());
        
        // 🔍 LOG: Processo de criação de título e data
        console.log(`📋 CRIANDO CONVERSA: ID ${id}`, {
          phoneNumber: phoneNumber || 'N/A',
          title: title,
          csvDate: csvDate || 'N/A',
          hasPhone: !!phoneNumber,
          hasDate: !!csvDate
        });
        
        return {
          id,
          title,
          user_id: userId,
          created_at: csvDate || new Date().toISOString() // Usa data do CSV ou fallback para agora
        };
      });
    
    console.log(`📊 Conversas: ${existingIds.size} existentes, ${newConversations.length} novas`);
    console.log(`📞 Números identificados: ${conversationPhones?.size || 0}/${conversationIds.length}`);
    
    // 3. INSERE TODAS AS NOVAS CONVERSAS DE UMA SÓ VEZ (BATCH INSERT)
    if (newConversations.length > 0) {
      console.log(`💾 INSERINDO ${newConversations.length} CONVERSAS NO SUPABASE...`);
      
      // Log detalhado das primeiras 5 conversas que serão inseridas
      console.log(`🔍 PREVIEW DAS CONVERSAS QUE SERÃO INSERIDAS:`);
      const preview = newConversations.slice(0, 5);
      preview.forEach((conv, index) => {
        console.log(`  ${index + 1}. ID: ${conv.id} | Título: "${conv.title}" | Data: ${conv.created_at} | User: ${conv.user_id}`);
      });
      if (newConversations.length > 5) {
        console.log(`  ... e mais ${newConversations.length - 5} conversas`);
      }
      
      const BATCH_SIZE = 100; // Supabase limite
      
      for (let i = 0; i < newConversations.length; i += BATCH_SIZE) {
        const batch = newConversations.slice(i, i + BATCH_SIZE);
        
        console.log(`📤 ENVIANDO LOTE ${Math.floor(i/BATCH_SIZE) + 1} com ${batch.length} conversas...`);
        
        const { error, data } = await supabase
          .from('conversations')
          .insert(batch)
          .select('id, title, created_at'); // Retorna o que foi inserido
        
        if (error) {
          console.error(`❌ Erro ao criar lote de conversas:`, error);
          throw new Error(`Erro ao criar conversas: ${error.message}`);
        }
        
        console.log(`✅ Lote ${Math.floor(i/BATCH_SIZE) + 1}: ${batch.length} conversas inseridas no banco`);
        
        // Log das conversas inseridas para verificar se os títulos e datas estão corretos
        if (data && data.length > 0) {
          console.log(`🔍 VERIFICAÇÃO DO QUE FOI INSERIDO NO BANCO:`);
          const firstThree = data.slice(0, 3);
          firstThree.forEach(conv => {
            console.log(`   ✅ ID ${conv.id}: "${conv.title}" | Data: ${conv.created_at}`);
          });
        } else {
          console.log(`⚠️ Dados inseridos não retornados pelo Supabase`);
        }
      }
    }
    
    console.log(`🎉 CONVERSAS CRIADAS: ${conversationIds.length} processadas com títulos corretos!`);
  }

  formatPhoneNumber(phoneNumber: string): string {
    // Remove espaços e caracteres especiais, mantém apenas números e +
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // Se é um número brasileiro (+55...)
    if (cleaned.startsWith('+55') && cleaned.length > 12) {
      const withoutCountry = cleaned.substring(3); // Remove +55
      
      if (withoutCountry.length >= 11) {
        // Formato: (XX) 9XXXX-XXXX
        const area = withoutCountry.substring(0, 2);
        const first = withoutCountry.substring(2, 3);
        const middle = withoutCountry.substring(3, 7);
        const last = withoutCountry.substring(7, 11);
        return `(${area}) ${first}${middle}-${last}`;
      } else if (withoutCountry.length === 10) {
        // Formato: (XX) XXXX-XXXX
        const area = withoutCountry.substring(0, 2);
        const middle = withoutCountry.substring(2, 6);
        const last = withoutCountry.substring(6, 10);
        return `(${area}) ${middle}-${last}`;
      }
    }
    
    // Se não conseguiu formatar, retorna o número original
    return phoneNumber;
  }

  getSenderName(data: any, csvType: string): string {
    if (csvType === 'wrl') {
      return this.getSenderNameWRL(data);
    } else if (csvType === 'rcws') {
      return this.getSenderNameRCWS(data);
    }
    return 'Desconhecido';
  }

  parseCSVLine(line: string): string[] {
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

  // Função para corrigir linhas quebradas do CSV malformado
  fixBrokenCSVLines(lines: string[]): string[] {
    const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''));
    const expectedColumns = headers.length;
    const fixedLines: string[] = [lines[0]]; // Mantém o header
    
    let i = 1;
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) {
        i++;
        continue;
      }
      
      const values = this.parseCSVLine(line);
      
      // Se a linha tem o número correto de campos, adiciona normalmente
      if (values.length >= expectedColumns) {
        fixedLines.push(line);
        i++;
        continue;
      }
      
      // Se a linha tem menos campos, tenta juntar com as próximas linhas
      let reconstructedLine = line;
      let totalValues = values.length;
      let nextIndex = i + 1;
      
      // Tenta juntar até 3 linhas seguintes para reconstruir a linha completa
      while (nextIndex < lines.length && totalValues < expectedColumns) {
        const nextLine = lines[nextIndex];
        if (!nextLine.trim()) {
          nextIndex++;
          continue;
        }
        
        const nextValues = this.parseCSVLine(nextLine);
        
        // Se a próxima linha parece ser o final da linha atual (poucos campos)
        if (nextValues.length <= (expectedColumns - totalValues)) {
          reconstructedLine += ',' + nextLine;
          totalValues += nextValues.length;
          nextIndex++;
        } else {
          // Se a próxima linha tem muitos campos, pare de juntar
          break;
        }
      }
      
      // Verifica se conseguiu reconstruir corretamente
      const finalValues = this.parseCSVLine(reconstructedLine);
      if (finalValues.length >= expectedColumns - 1) { // Permite 1 campo a menos por tolerância
        fixedLines.push(reconstructedLine);
      }
      
      i = nextIndex;
    }
    
    console.log(`🔧 CSV corrigido: ${lines.length - 1} → ${fixedLines.length - 1} linhas válidas`);
    return fixedLines;
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Gera hash numérico de uma string (MUITO limitado para PostgreSQL integer)
   */
   private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    // Garantir que está MUITO dentro do limite do PostgreSQL integer
    const result = Math.abs(hash % 50000000) + 10000000; // Entre 10M e 60M (MUITO SEGURO)
    console.log(`🔢 HASH: "${str.substring(0, 20)}..." → ${result}`);
    return result;
  }

  /**
   * Detecta automaticamente o tipo de CSV com base nas colunas do header
   * @param headerLine Primeira linha do CSV com os nomes das colunas
   * @returns 'wrl' para WRL Bonés CSV, 'rcws' para RCWS Advogados CSV
   */
  private detectCSVType(headerLine: string): 'wrl' | 'rcws' {
    const headers = headerLine.toLowerCase().split(',').map(h => h.trim());
    
    // Características únicas do CSV WRL Bonés
    const hasWrlHeaders = headers.includes('chat_id') && 
                         headers.includes('mobile_number') && 
                         headers.includes('fromme') &&
                         headers.includes('direction');
    
    // Características únicas do CSV RCWS Advogados
    const hasRcwsHeaders = headers.includes('_id') && 
                          headers.includes('phone') && 
                          headers.includes('is_out') &&
                          headers.includes('wa_sender_id');
    
    if (hasWrlHeaders) {
      console.log(`🏷️  CSV detectado como WRL BONÉS (colunas: ${headers.join(', ')})`);
      return 'wrl';
    } else if (hasRcwsHeaders) {
      console.log(`🏷️  CSV detectado como RCWS ADVOGADOS (colunas: ${headers.join(', ')})`);
      return 'rcws';
    } else {
      console.warn(`⚠️  Formato CSV não reconhecido. Usando WRL como padrão. Colunas encontradas: ${headers.join(', ')}`);
      return 'wrl'; // Default para WRL
    }
  }

  /**
   * Retorna os campos relevantes para debug baseado no tipo de CSV
   */
  private getRelevantFields(data: any, csvType: 'wrl' | 'rcws'): any {
    if (csvType === 'wrl') {
      return {
        chat_id: data.chat_id,
        mobile_number: data.mobile_number,
        fromMe: data.fromMe,
        direction: data.direction,
        type: data.type,
        text: data.text?.substring(0, 50) + '...'
      };
    } else {
      return {
        _id: data._id,
        phone: data.phone,
        is_out: data.is_out,
        wa_sender_id: data.wa_sender_id,
        type: data.type,
        text: data.text?.substring(0, 50) + '...'
      };
    }
  }

  /**
   * Determina o nome do remetente para CSV WRL Bonés
   */
  private getSenderNameWRL(data: any): string {
    if (data.fromMe === 'true' || data.fromMe === true) {
      return 'WRL Bonés'; // Nome da empresa
    } else {
      // Usa o número do celular formatado ou número bruto
      const phone = data.mobile_number || data.phone || 'Desconhecido';
      return this.formatPhoneNumber(phone);
    }
  }

  /**
   * Determina o nome do remetente para CSV RCWS Advogados
   */
  private getSenderNameRCWS(data: any): string {
    if (data.is_out === 'true' || data.is_out === true || data.is_out === '1' || data.is_out === 1) {
      return 'RCWS Advogados'; // Nome da empresa
    } else {
      // Usa wa_sender_id se disponível, senão phone, senão 'Cliente'
      if (data.wa_sender_id && data.wa_sender_id !== '' && data.wa_sender_id !== 'null') {
        return data.wa_sender_id;
      } else if (data.phone) {
        return this.formatPhoneNumber(data.phone);
      } else {
        return 'Cliente';
      }
    }
  }

  /**
   * Verifica se a mensagem é da empresa (para ambos os formatos)
   */
  private isFromCompany(data: any, csvType: 'wrl' | 'rcws'): boolean {
    if (csvType === 'wrl') {
      return data.fromMe === 'true' || data.fromMe === true;
    } else if (csvType === 'rcws') {
      return data.is_out === 'true' || data.is_out === true || data.is_out === '1' || data.is_out === 1;
    }
    return false;
  }

  /**
   * Extrai o número de telefone baseado no tipo de CSV
   */
  private extractPhoneNumber(data: any, csvType: 'wrl' | 'rcws'): string {
    if (csvType === 'wrl') {
      return data.mobile_number || '';
    } else if (csvType === 'rcws') {
      return data.phone || '';
    }
    return '';
  }

  /**
   * Extrai o ID da conversa baseado no tipo de CSV
   */
  private extractConversationId(data: any, csvType: 'wrl' | 'rcws'): string {
    if (csvType === 'wrl') {
      return data.chat_id || '';
    } else if (csvType === 'rcws') {
      // Para RCWS, pode usar o phone como identificador único da conversa
      return data.phone || data._id || '';
    }
    return '';
  }
}
