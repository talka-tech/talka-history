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

    if (this.onProgress) this.onProgress(10, 'Iniciando compressão automática...');
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

    if (this.onProgress) this.onProgress(20, 'Validação aprovada! Processando dados...');

    // Processa o CSV diretamente no frontend
    return this.processCSVDirectly(text, userId);
  }

  async processCSVDirectly(csvContent: string, userId: number): Promise<any> {
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''));
    
    if (this.onProgress) this.onProgress(30, 'Processando conversas...');

    const messagesToInsert: any[] = [];
    const conversationIds = new Set();
    let processedLines = 0;

    // Processa linha por linha
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      const values = this.parseCSVLine(line);
      if (values.length < headers.length) continue;

      const data: any = {};
      headers.forEach((h, index) => {
        data[h] = values[index]?.replace(/['"]/g, '').trim() || '';
      });

      if (data.type !== 'text' || !data.text) continue;

      conversationIds.add(data.chat_id);
      
      messagesToInsert.push({
        id: `${data.chat_id}_${data.message_created}_${Math.random()}`,
        conversation_id: data.chat_id,
        sender: data.fromMe === '1' ? 'Você' : (data.mobile_number || 'Desconhecido'),
        content: data.text,
        timestamp: data.message_created || new Date().toISOString(),
        from_me: data.fromMe === '1',
        user_id: userId
      });

      processedLines++;
      
      // Atualiza progresso a cada 100 linhas
      if (processedLines % 100 === 0) {
        const progress = 30 + Math.min(40, (processedLines / lines.length) * 40);
        if (this.onProgress) {
          this.onProgress(progress, `Processadas ${processedLines} mensagens...`);
        }
      }
    }

    if (this.onProgress) this.onProgress(70, 'Salvando no banco de dados...');

    // Insere em lotes no Supabase
    const BATCH_SIZE = 100;
    let totalInserted = 0;

    for (let i = 0; i < messagesToInsert.length; i += BATCH_SIZE) {
      const batch = messagesToInsert.slice(i, i + BATCH_SIZE);
      
      const { error } = await supabase
        .from('messages')
        .upsert(batch, { onConflict: 'id' });

      if (error) {
        console.error('❌ Erro ao inserir lote:', error);
        throw new Error(`Erro ao salvar mensagens: ${error.message}`);
      }

      totalInserted += batch.length;
      
      const progress = 70 + Math.min(25, (totalInserted / messagesToInsert.length) * 25);
      if (this.onProgress) {
        this.onProgress(progress, `Salvando... ${totalInserted}/${messagesToInsert.length} mensagens`);
      }
    }

    if (this.onProgress) this.onProgress(95, 'Finalizando...');

    // Atualiza as conversas
    await this.updateConversations(Array.from(conversationIds) as string[], userId);

    if (this.onProgress) this.onProgress(100, 'Processo concluído!');

    return {
      success: true,
      totalMessages: totalInserted,
      conversations: conversationIds.size,
      message: `${totalInserted} mensagens de ${conversationIds.size} conversas processadas com sucesso!`
    };
  }

  async updateConversations(conversationIds: string[], userId: number) {
    // Para cada conversa, busca a última mensagem e conta
    for (const convId of conversationIds) {
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(1);

      if (error || !messages || messages.length === 0) continue;

      const lastMessage = messages[0];
      
      // Conta total de mensagens da conversa
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact' })
        .eq('conversation_id', convId)
        .eq('user_id', userId);

      // Upsert da conversa
      await supabase
        .from('conversations')
        .upsert({
          id: convId,
          title: this.generateConversationTitle(lastMessage),
          last_message: lastMessage.content?.substring(0, 100) || '',
          last_timestamp: lastMessage.timestamp,
          message_count: count || 0,
          user_id: userId
        }, { onConflict: 'id' });
    }
  }

  generateConversationTitle(lastMessage: any): string {
    if (lastMessage.from_me) {
      return `Conversa ${lastMessage.conversation_id}`;
    }
    return lastMessage.sender || `Conversa ${lastMessage.conversation_id}`;
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

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
