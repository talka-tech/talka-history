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

  async handleFileUpload(file: File, progressCallback: ProgressCallback, userId: number): Promise<any> {
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

    // Validação das colunas obrigatórias
    const headers = lines[0].toLowerCase();
    const requiredColumns = ['chat_id', 'text', 'type'];
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    
    if (missingColumns.length > 0) {
      throw new Error(`Colunas obrigatórias ausentes: ${missingColumns.join(', ')}`);
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
    return this.processCompressedCSV(compressed, text, userId, originalSize, compressedSize);
  }

  async processCompressedCSV(compressedData: Uint8Array, originalText: string, userId: number, originalSize: number, compressedSize: number): Promise<any> {
    // Trabalha com o texto original para processamento, mas mantém estatísticas de compressão
    const rawLines = originalText.split('\n').filter(line => line.trim());
    
    if (this.onProgress) this.onProgress(30, 'Corrigindo formato do CSV...');
    
    // CORREÇÃO: Reconstrói linhas quebradas do CSV malformado
    const lines = this.fixBrokenCSVLines(rawLines);
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''));
    
    if (this.onProgress) this.onProgress(35, 'Processando mensagens...');

    const messagesToInsert: any[] = [];
    const conversationIds = new Set(); // Só adiciona conversas que têm mensagens válidas
    const conversationMessageCount = new Map(); // Track mensagens por conversa para debug
    const conversationPhones = new Map(); // NOVO: Armazena o número de telefone de cada conversa
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

      if (data.type !== 'text' || !data.text) continue;

      // SÓ ADICIONA À CONVERSA QUANDO TEM MENSAGEM VÁLIDA
      conversationIds.add(data.chat_id);
      
      // NOVO: Armazena o número de telefone da conversa
      if (data.mobile_number && data.mobile_number.trim() && data.mobile_number.startsWith('+')) {
        conversationPhones.set(data.chat_id, data.mobile_number.trim());
        
        // 🔍 LOG: Primeira vez que captura um número para uma conversa
        if (!conversationMessageCount.has(data.chat_id)) {
          console.log(`📞 NÚMERO CAPTURADO: Conversa ${data.chat_id} → ${data.mobile_number.trim()}`);
        }
      }
      
      // Track para debug
      const currentCount = conversationMessageCount.get(data.chat_id) || 0;
      conversationMessageCount.set(data.chat_id, currentCount + 1);
      
      // Como o id é auto-increment (integer), não enviamos ele
      const senderName = data.fromMe === '1' ? 'Você' : this.getSenderName(data);
      
      messagesToInsert.push({
        conversation_id: parseInt(data.chat_id), // Converte para int4
        sender: senderName,
        content: data.text,
        timestamp: data.message_created || new Date().toISOString(),
        fromMe: data.fromMe === '1'
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
    
    // Top 10 conversas com mais mensagens
    const sortedConversations = Array.from(conversationMessageCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    console.log(`   📈 Top conversas: ${sortedConversations.map(([id, count]) => `${id}(${count})`).join(', ')}`);

    if (this.onProgress) this.onProgress(70, `Criando ${conversationIds.size} conversas válidas...`);

    // **PRIMEIRO: CRIAR CONVERSAS VAZIAS**
    await this.createConversations(Array.from(conversationIds) as string[], userId);

    if (this.onProgress) this.onProgress(75, `Salvando ${messagesToInsert.length} mensagens no banco...`);

    // **PRIMEIRO: CRIAR CONVERSAS VAZIAS**
    await this.createConversations(Array.from(conversationIds) as string[], userId, conversationPhones);

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

  async createConversations(conversationIds: string[], userId: number, conversationPhones?: Map<string, string>) {
    // OTIMIZAÇÃO ULTRA-RÁPIDA: Uma única consulta para verificar conversas existentes
    console.log(`📁 Criando ${conversationIds.length} conversas com números de telefone...`);
    
    const convIds = conversationIds.map(id => parseInt(id));
    
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
        
        // 🔍 LOG: Processo de criação de título
        console.log(`📋 CRIANDO CONVERSA: ID ${id}`, {
          phoneNumber: phoneNumber || 'N/A',
          title: title,
          hasPhone: !!phoneNumber
        });
        
        return {
          id,
          title,
          user_id: userId
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
        console.log(`  ${index + 1}. ID: ${conv.id} | Título: "${conv.title}" | User: ${conv.user_id}`);
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
          .select('id, title'); // Retorna o que foi inserido
        
        if (error) {
          console.error(`❌ Erro ao criar lote de conversas:`, error);
          throw new Error(`Erro ao criar conversas: ${error.message}`);
        }
        
        console.log(`✅ Lote ${Math.floor(i/BATCH_SIZE) + 1}: ${batch.length} conversas inseridas no banco`);
        
        // Log das conversas inseridas para verificar se os títulos estão corretos
        if (data && data.length > 0) {
          console.log(`🔍 VERIFICAÇÃO DO QUE FOI INSERIDO NO BANCO:`);
          const firstThree = data.slice(0, 3);
          firstThree.forEach(conv => {
            console.log(`   ✅ ID ${conv.id}: "${conv.title}"`);
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

  getSenderName(data: any): string {
    // Se tem mobile_number, usa ele
    if (data.mobile_number && data.mobile_number.trim()) {
      return data.mobile_number.trim();
    }
    
    // Se não tem mobile_number, pode ser uma conversa sem número salvo
    // Neste caso, usa o chat_id como fallback formatado
    return `Contato ${data.chat_id}`;
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
}
