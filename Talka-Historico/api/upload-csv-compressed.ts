import express from 'express';
import multer from 'multer';
import zlib from 'zlib';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';
import { supabase } from '../lib/supabase.ts';

// Configuração do multer para arquivos comprimidos
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const tempDir = './temp/';
    try {
      await fs.mkdir(tempDir, { recursive: true });
      cb(null, tempDir);
    } catch (error) {
      cb(error, tempDir);
    }
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage, 
  limits: { 
    fileSize: 100 * 1024 * 1024 // 100MB limite para arquivos comprimidos
  } 
});

// Função principal do handler
export default async function handler(req: any, res: any, next: any) {
  console.log('🗜️ Handler de compressão ativado');

  // Use multer middleware
  upload.single('file')(req, res, async (err) => {
    if (err) {
      console.error('❌ Erro no multer:', err);
      return res.status(400).json({ error: 'Erro no upload: ' + err.message });
    }

    try {
      const uploadedFile = req.file;
      const userId = req.body.userId || req.headers['x-user-id'];
      
      if (!uploadedFile) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      if (!userId) {
        return res.status(400).json({ error: 'User ID é obrigatório' });
      }

      console.log('📦 Processando arquivo comprimido:', {
        originalName: uploadedFile.originalname,
        size: uploadedFile.size,
        userId: userId
      });

      let csvContent: string;

      // Se o arquivo termina com .gz, descomprime
      if (uploadedFile.originalname.endsWith('.gz')) {
        console.log('🗜️ Descomprimindo arquivo GZIP...');
        csvContent = await decompressFile(uploadedFile.path);
        console.log('✅ Descompressão concluída');
      } else {
        // Se não for comprimido, lê diretamente
        csvContent = await fs.readFile(uploadedFile.path, 'utf-8');
      }

      // Processa o CSV usando a mesma lógica da API existente
      const result = await processCSVContent(csvContent, parseInt(userId));

      // Remove o arquivo temporário
      try {
        await fs.unlink(uploadedFile.path);
      } catch (unlinkError) {
        console.warn('⚠️ Erro ao remover arquivo temporário:', unlinkError);
      }

      console.log('🎉 Upload comprimido processado com sucesso:', result);
      res.json(result);

    } catch (error) {
      console.error('❌ Erro no upload comprimido:', error);
      
      // Remove arquivo temporário em caso de erro
      if (req.file?.path) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.warn('⚠️ Erro ao remover arquivo após falha:', unlinkError);
        }
      }
      
      res.status(500).json({ 
        error: 'Erro no processamento do arquivo comprimido',
        details: error.message 
      });
    }
  });
}

// Função para descomprimir arquivo GZIP
async function decompressFile(compressedPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    
    const readStream = createReadStream(compressedPath);
    const gunzip = zlib.createGunzip();
    
    gunzip.on('data', (chunk) => {
      chunks.push(chunk);
    });
    
    gunzip.on('end', () => {
      const decompressedBuffer = Buffer.concat(chunks);
      const decompressedText = decompressedBuffer.toString('utf-8');
      resolve(decompressedText);
    });
    
    gunzip.on('error', reject);
    
    readStream.pipe(gunzip);
  });
}

// Função para processar conteúdo CSV (reutiliza lógica existente)
async function processCSVContent(csvContent: string, userId: number) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('CSV vazio ou inválido');
  }

  console.log(`📊 Processando CSV: ${lines.length} linhas para usuário ${userId}`);

  // Validação básica do header
  const header = lines[0].toLowerCase();
  const requiredColumns = ['chat_id', 'text', 'type'];
  const missingColumns = requiredColumns.filter(col => !header.includes(col));
  
  if (missingColumns.length > 0) {
    throw new Error(`Colunas obrigatórias ausentes: ${missingColumns.join(', ')}`);
  }

  // Processa em lotes de 100 linhas
  const BATCH_SIZE = 100;
  let totalMessages = 0;
  let conversationIds = new Set();
  
  for (let i = 1; i < lines.length; i += BATCH_SIZE) {
    const batch = lines.slice(i, i + BATCH_SIZE);
    const result = await processBatch(batch, lines[0], userId);
    totalMessages += result.messagesInserted;
    result.conversationIds.forEach(id => conversationIds.add(id));
    
    console.log(`📦 Lote ${Math.ceil(i / BATCH_SIZE)} processado: ${result.messagesInserted} mensagens`);
  }

  return {
    success: true,
    totalMessages,
    conversations: conversationIds.size,
    message: `${totalMessages} mensagens de ${conversationIds.size} conversas processadas com sucesso!`
  };
}

// Função auxiliar para processar lote de mensagens
async function processBatch(batch: string[], header: string, userId: number) {
  const headers = header.split(',').map(h => h.trim().replace(/['"]/g, ''));
  const messagesToInsert: any[] = [];
  const conversationIds = new Set();

  for (const line of batch) {
    if (!line.trim()) continue;
    
    const values = parseCSVLine(line);
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
  }

  if (messagesToInsert.length > 0) {
    const { error } = await supabase
      .from('messages')
      .upsert(messagesToInsert, { onConflict: 'id' });

    if (error) {
      console.error('❌ Erro ao inserir lote:', error);
      throw error;
    }
  }

  return {
    messagesInserted: messagesToInsert.length,
    conversationIds: Array.from(conversationIds)
  };
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
