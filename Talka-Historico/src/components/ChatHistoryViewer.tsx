import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Upload, Search, MessageCircle, Users, Calendar, FileText, LogOut, Settings, Trash2, MoreVertical } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Interfaces permanecem as mesmas
interface Message {
  id: string;
  timestamp: string;
  sender: string;
  content: string;
  conversationId: string;
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

interface ChatHistoryViewerProps {
  onLogout: () => void;
  currentUser: string; // Recebemos o usuário logado
  currentUserId: number; // E o ID dele
}

const ChatHistoryViewer = ({ onLogout, currentUser, currentUserId }: ChatHistoryViewerProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isLoadingAfterUpload, setIsLoadingAfterUpload] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeletingData, setIsDeletingData] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, message: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [conversationsPerPage] = useState(10);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Função para extrair nome da empresa do username
  const getCompanyDisplayName = (username: string) => {
    // Remove espaços extras e converte para título adequado
    return username
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Função para buscar conversas salvas da API
  const fetchConversations = useCallback(async () => {
    setIsFetching(true);
    try {
        const response = await fetch(`/api/conversations?userId=${currentUserId}`);
        if (!response.ok) {
            throw new Error('Falha ao buscar conversas.');
        }
        const data = await response.json();
        setConversations(data);
    } catch (error) {
        toast({
            title: "Erro",
            description: "Não foi possível carregar o histórico de conversas.",
            variant: "destructive"
        });
    } finally {
        setIsFetching(false);
        setIsLoadingAfterUpload(false); // Remove loading pós-upload
    }
  }, [currentUserId]);

  // Função para limpar dados
  const handleClearData = useCallback(async () => {
    if (!currentUserId) return;
    
    try {
      setIsDeletingData(true);
      
      console.log('🗑️ Iniciando limpeza de dados para usuário:', currentUserId);
      
      const response = await fetch('/api/clear-data-supabase', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUserId
        })
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Erro na response:', errorData);
        throw new Error(errorData.error || errorData.details || 'Falha ao limpar dados');
      }

      const result = await response.json();
      console.log('✅ Resultado da limpeza:', result);
      
      // Atualiza o estado local
      setConversations([]);
      setSelectedConversation(null);
      setShowSettings(false);
      setShowDeleteModal(false);
      
      toast({
        title: "✅ Dados limpos!",
        description: result.message,
        variant: "default",
        duration: 5000
      });
      
      // Força uma nova busca para confirmar que está vazio
      console.log('🔄 Fazendo nova busca para confirmar limpeza...');
      setTimeout(() => {
        fetchConversations();
      }, 1000);
      
    } catch (error) {
      console.error('❌ Erro ao limpar dados:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível limpar os dados. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingData(false);
    }
  }, [currentUserId, toast, fetchConversations]);

  // Função para excluir uma conversa específica
  const handleDeleteConversation = useCallback(async (conversationId: string) => {
    try {
      console.log('🗑️ Excluindo conversa:', conversationId);
      
      const response = await fetch('/api/delete-conversation', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId,
          userId: currentUserId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao excluir conversa');
      }

      // Remove a conversa da lista local
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      
      // Se a conversa excluída estava selecionada, desseleciona
      if (selectedConversation && selectedConversation.id === conversationId) {
        setSelectedConversation(null);
      }

      toast({
        title: "✅ Conversa excluída!",
        description: "A conversa foi removida com sucesso.",
        variant: "default",
        duration: 3000
      });

    } catch (error) {
      console.error('❌ Erro ao excluir conversa:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível excluir a conversa.",
        variant: "destructive",
      });
    }
  }, [currentUserId, selectedConversation, toast]);
  const handleDeleteMessage = useCallback(async (messageId: string, conversationId: string) => {
    try {
      console.log('🗑️ Excluindo mensagem:', { messageId, conversationId });
      
      const response = await fetch('/api/delete-message', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId,
          conversationId,
          userId: currentUserId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao excluir mensagem');
      }

      // Atualiza a conversa local removendo a mensagem
      if (selectedConversation && selectedConversation.id === conversationId) {
        const updatedMessages = selectedConversation.messages.filter(msg => msg.id !== messageId);
        const updatedConversation = {
          ...selectedConversation,
          messages: updatedMessages,
          messageCount: updatedMessages.length,
          lastMessage: updatedMessages.length > 0 ? updatedMessages[updatedMessages.length - 1].content.substring(0, 50) : 'Nenhuma mensagem',
          lastTimestamp: updatedMessages.length > 0 ? updatedMessages[updatedMessages.length - 1].timestamp : selectedConversation.lastTimestamp
        };
        setSelectedConversation(updatedConversation);
      }

      // Atualiza a lista de conversas
      setConversations(prev => prev.map(conv => {
        if (conv.id === conversationId) {
          const updatedMessages = conv.messages.filter(msg => msg.id !== messageId);
          return {
            ...conv,
            messages: updatedMessages,
            messageCount: updatedMessages.length,
            lastMessage: updatedMessages.length > 0 ? updatedMessages[updatedMessages.length - 1].content.substring(0, 50) : 'Nenhuma mensagem',
            lastTimestamp: updatedMessages.length > 0 ? updatedMessages[updatedMessages.length - 1].timestamp : conv.lastTimestamp
          };
        }
        return conv;
      }));

      toast({
        title: "✅ Mensagem excluída!",
        description: "A mensagem foi removida com sucesso.",
        variant: "default",
        duration: 3000
      });

    } catch (error) {
      console.error('❌ Erro ao excluir mensagem:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível excluir a mensagem.",
        variant: "destructive",
      });
    }
  }, [currentUserId, selectedConversation, toast]);

  // Busca as conversas quando o componente carrega
  useEffect(() => {
    if (currentUserId) {
        fetchConversations();
    }
  }, [currentUserId, fetchConversations]);

  // **FUNÇÃO PARA UPLOAD EM CHUNKS - SOLUÇÃO PARA ERRO 413**
  const uploadFileInChunks = async (fileContent: string, userId: number): Promise<boolean> => {
    try {
      const CHUNK_SIZE = 512 * 1024; // 512KB chunks para processamento mais rápido
      const totalChunks = Math.ceil(fileContent.length / CHUNK_SIZE);
      
      console.log(`[CHUNK UPLOAD] Iniciando upload de ${totalChunks} chunks de 512KB`);
      
      // Inicializa progresso
      setUploadProgress({ current: 0, total: totalChunks, message: 'Preparando upload...' });
      
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, fileContent.length);
        const chunk = fileContent.slice(start, end);
        const isLastChunk = i === totalChunks - 1;
        
        console.log(`[CHUNK ${i + 1}/${totalChunks}] Tamanho: ${chunk.length} caracteres`);
        
        // Atualiza progresso visual
        const progressPercent = Math.round(((i + 1) / totalChunks) * 100);
        setUploadProgress({ 
          current: i + 1, 
          total: totalChunks, 
          message: `Processando pedaço ${i + 1} de ${totalChunks} (${progressPercent}%)` 
        });
        
        toast({
          title: `📤 Upload em andamento`,
          description: `Pedaço ${i + 1}/${totalChunks} - ${progressPercent}% concluído`,
          duration: 1500
        });
        
        // Timeout específico para cada chunk (5 minutos)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.error(`⏰ Chunk ${i + 1} timeout após 5 minutos`);
          controller.abort();
        }, 300000); // 5 minutos por chunk
        
        // Marca tempo de início do chunk
        const chunkStartTime = Date.now();
        
        console.log(`[CHUNK ${i + 1}] Enviando para /api/upload-csv-fast...`);
        
        const response = await fetch('/api/upload-csv-fast', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chunk: chunk, // Chunk completo agora
            chunkIndex: i,
            totalChunks: totalChunks,
            isLastChunk: isLastChunk,
            userId: userId
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        const chunkProcessTime = Date.now() - chunkStartTime;
        
        if (!response.ok) {
          const errorData = await response.text();
          console.error(`[CHUNK ${i + 1}] Erro HTTP ${response.status}:`, errorData);
          throw new Error(`Falha no pedaço ${i + 1}: ${response.status} - ${errorData}`);
        }
        
        const result = await response.json();
        console.log(`[CHUNK ${i + 1}] Processado em ${chunkProcessTime}ms:`, result);
        
        // Atualiza progresso com detalhes em tempo real
        const newProgress = {
          current: i + 1,
          total: totalChunks,
          message: `✅ Chunk ${i + 1}/${totalChunks}: ${result.messagesFound || 0} mensagens de ${result.linesProcessed || 0} linhas (${(chunkProcessTime/1000).toFixed(1)}s)`
        };
        setUploadProgress(newProgress);
        
        // Toast com informações detalhadas 
        toast({
          title: `✅ Chunk ${i + 1} processado`,
          description: `${result.messagesFound || 0} mensagens salvas • ${result.linesProcessed || 0} linhas • ${(chunkProcessTime/1000).toFixed(1)}s`,
          duration: 2000
        });
        
        if (isLastChunk) {
          // Calcula total de mensagens processadas
          let totalMessages = 0;
          // Aqui você pode somar de todos os chunks se quiser
          
          setUploadProgress({ 
            current: totalChunks, 
            total: totalChunks, 
            message: `🎉 Upload completo! Processamento finalizado com sucesso` 
          });
          
          toast({
            title: "🎉 Upload completo!",
            description: `Arquivo processado com sucesso! Atualizando lista de conversas...`,
            variant: "default",
            duration: 10000
          });
        }
        
        // Pequena pausa entre chunks para não sobrecarregar
        if (!isLastChunk) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      return true;
    } catch (error) {
      console.error('[CHUNK UPLOAD ERROR]:', error);
      setUploadProgress({ current: 0, total: 0, message: 'Erro no upload' });
      
      toast({
        title: "❌ Erro no upload",
        description: error instanceof Error ? error.message : "Erro desconhecido durante upload em pedaços",
        variant: "destructive",
        duration: 10000
      });
      return false;
    }
  };

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('📁 File selected:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString()
    });

    // Verificar se é um arquivo CSV (verificação dupla)
    const isCSV = file.name.toLowerCase().endsWith('.csv') || 
                  file.type === 'text/csv' || 
                  file.type === 'application/csv';
    
    if (!isCSV) {
      console.error('❌ File validation failed: Not a CSV file');
      toast({
        title: "Erro no arquivo",
        description: "Por favor, selecione apenas arquivos CSV (.csv).",
        variant: "destructive"
      });
      return;
    }

    console.log('📊 File size:', {
      fileSize: file.size,
      sizeMB: (file.size / 1024 / 1024).toFixed(2)
    });

    setIsUploading(true);
    console.log('🚀 Starting upload process...');
    
    try {
      toast({
        title: "Validando arquivo...",
        description: "Verificando formato CSV e estrutura dos dados...",
      });

      console.log('📖 Reading file content...');
      const text = await file.text();
      console.log('✅ File read successfully:', {
        contentLength: text.length,
        lines: text.split('\n').length,
        firstLine: text.split('\n')[0]?.substring(0, 100) + '...'
      });

      // Validar estrutura do CSV
      const lines = text.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        throw new Error('Arquivo CSV vazio ou com apenas cabeçalho. Certifique-se de que há dados no arquivo.');
      }

      const headers = lines[0].toLowerCase();
      const requiredColumns = ['chat_id', 'text', 'type'];
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));
      
      if (missingColumns.length > 0) {
        throw new Error(`Colunas obrigatórias ausentes no CSV: ${missingColumns.join(', ')}. Verifique se o arquivo tem as colunas corretas.`);
      }

      console.log('✅ CSV validation passed:', {
        totalLines: lines.length,
        headers: headers,
        dataLines: lines.length - 1
      });

      toast({
        title: "Enviando...",
        description: `Enviando ${(file.size / 1024 / 1024).toFixed(2)}MB para o servidor. Isso pode levar alguns minutos...`,
      });
      
      // Preparar dados de envio
      const requestData = {
        url: '/api/upload-csv',
        method: 'POST',
        headers: { 
          'Content-Type': 'text/plain',
          'x-user-id': currentUserId.toString()
        },
        bodySize: text.length
      };
      
      console.log('📤 Preparing request:', requestData);
      
      // Envia o CSV diretamente para a API com timeout maior
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.error('⏰ Request timeout after 5 minutes');
        controller.abort();
      }, 300000); // 5 minutos
      
      console.log('🌐 Sending request to /api/upload-csv...');
      const requestStart = Date.now();
      
      // **DECISÃO: Upload direto - simples e eficiente**
      console.log('📦 Usando upload direto otimizado...');
      
      toast({
        title: "🚀 Processando arquivo...",
        description: `Enviando ${(file.size / 1024 / 1024).toFixed(2)}MB para processamento...`,
        duration: 5000
      });
      
      // Simula progresso para feedback visual
      setUploadProgress({ current: 1, total: 1, message: 'Enviando arquivo para o servidor...' });
      
      // Upload direto para a nova API
      const response = await fetch('/api/upload-simple', {
        method: 'POST',
        headers: { 
          'Content-Type': 'text/plain',
          'x-user-id': currentUserId.toString()
        },
        body: text,
        signal: controller.signal
      });

      const requestTime = Date.now() - requestStart;
      console.log('📡 Request completed:', {
        status: response.status,
        statusText: response.statusText,
        responseTime: `${requestTime}ms`
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error('❌ Response not OK:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url
        });
        
        let errorMessage = '';
        let errorData: any = {};
        
        try {
          errorData = await response.json();
          console.error('🔥 Error response data:', errorData);
        } catch (parseError) {
          console.error('❌ Failed to parse error response:', parseError);
          const responseText = await response.text();
          console.error('❌ Raw error response:', responseText.substring(0, 500));
        }
        
        if (response.status === 413) {
          errorMessage = `❌ ARQUIVO MUITO GRANDE (${(file.size / 1024 / 1024).toFixed(2)}MB)\n\n` +
                        `O servidor não conseguiu processar um arquivo deste tamanho.\n` +
                        `Tente dividir o CSV em arquivos menores.`;
        } else if (response.status === 500) {
          errorMessage = `❌ ERRO INTERNO DO SERVIDOR (500)\n\n` +
                        `Detalhes: ${errorData.details || errorData.error || 'Erro desconhecido'}\n\n` +
                        `Tente novamente em alguns minutos.`;
        } else if (response.status === 400) {
          errorMessage = `❌ PROBLEMA NO ARQUIVO CSV\n\n` +
                        `${errorData.error || 'Formato inválido'}\n\n` +
                        `Verifique se o arquivo está no formato correto.`;
        } else {
          errorMessage = `❌ ERRO DESCONHECIDO (${response.status})\n\n` +
                        `${errorData.error || errorData.message || response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }

      console.log('✅ Response OK, parsing result...');
      let result;
      try {
        result = await response.json();
        console.log('📊 Upload result:', result);
      } catch (parseError) {
        console.error('❌ Failed to parse success response:', parseError);
        throw new Error('Resposta do servidor inválida');
      }
      
      // Atualiza progresso final
      setUploadProgress({ 
        current: 1, 
        total: 1, 
        message: `✅ Concluído! ${result.totalMessages} mensagens de ${result.conversations} conversas processadas` 
      });
      
      // Atualiza a lista de conversas
      setIsLoadingAfterUpload(true); // Ativa loading animado
      fetchConversations();
      
      toast({
        title: "🎉 Upload Concluído!",
        description: `${result.conversations} conversas processadas com ${result.totalMessages} mensagens salvas!`,
        variant: "default",
        duration: 10000
      });
    } catch (error) {
      if (error.name === 'AbortError') {
        toast({
          title: "Timeout",
          description: "O upload levou muito tempo. Tente com um arquivo menor.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Erro ao processar arquivo",
          description: error.message,
          variant: "destructive"
        });
      }
    } finally {
      setIsUploading(false);
      setUploadProgress({ current: 0, total: 0, message: '' }); // Limpa progresso
      // Limpa o input de arquivo para permitir o upload do mesmo arquivo novamente
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [currentUserId, fetchConversations]); // Adiciona dependências

  // A função parseCSVToConversations e parseCSVLine continuam as mesmas...
  const parseCSVToConversations = useCallback((csvText: string): Conversation[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];
    
    const headers = lines[0].split(',').map(h => h.trim());
    const messages: Message[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      const values = parseCSVLine(line);
      
      if (values.length >= headers.length) {
        const chat_id = values[headers.indexOf('chat_id')]?.trim();
        const mobile_number = values[headers.indexOf('mobile_number')]?.trim();
        const fromMe = values[headers.indexOf('fromMe')]?.trim();
        const text = values[headers.indexOf('text')]?.trim();
        const message_created = values[headers.indexOf('message_created')]?.trim();
        const type = values[headers.indexOf('type')]?.trim();

        if (type !== 'text' || !text) continue;

        const sender = fromMe === '1' ? 'Você' : (mobile_number || 'Desconhecido');

        messages.push({
          id: `msg_${i}`,
          timestamp: message_created || new Date().toISOString(),
          sender: sender,
          content: text,
          conversationId: chat_id || 'default',
          fromMe: fromMe === '1'
        });
      }
    }

    const conversationMap = new Map<string, Message[]>();
    messages.forEach(msg => {
      const convId = msg.conversationId;
      if (!conversationMap.has(convId)) {
        conversationMap.set(convId, []);
      }
      conversationMap.get(convId)!.push(msg);
    });

    const conversations: Conversation[] = [];
    conversationMap.forEach((msgs, convId) => {
      const participants = [...new Set(msgs.map(m => m.sender))];
      const sortedMsgs = msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      const lastMsg = sortedMsgs[sortedMsgs.length - 1];
      
      const phoneNumbers = participants.filter(p => p !== 'Você');
      const title = phoneNumbers.length > 0 
        ? `${phoneNumbers[0]} ${phoneNumbers.length > 1 ? `+${phoneNumbers.length - 1} outros` : ''}`
        : `Conversa ${convId}`;
      
      conversations.push({
        id: convId,
        title: title,
        participants,
        messageCount: msgs.length,
        lastMessage: lastMsg.content.substring(0, 50) + (lastMsg.content.length > 50 ? '...' : ''),
        lastTimestamp: lastMsg.timestamp,
        messages: sortedMsgs
      });
    });

    return conversations.sort((a, b) => new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime());
  }, []);

  const parseCSVLine = useCallback((line: string): string[] => {
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
  }, []);

  const filteredConversations = useMemo(() => 
    conversations.filter(conv => {
      if (!conv) return false;
      
      const titleMatch = conv.title?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
      const participantsMatch = conv.participants?.some(p => 
        p?.toLowerCase().includes(searchTerm.toLowerCase())
      ) || false;
      const messagesMatch = conv.messages?.some(m => 
        m?.content?.toLowerCase().includes(searchTerm.toLowerCase())
      ) || false;
      
      return titleMatch || participantsMatch || messagesMatch;
    }), [conversations, searchTerm]);

  // Paginação com carregamento lazy
  const totalPages = Math.ceil(filteredConversations.length / conversationsPerPage);
  const startIndex = (currentPage - 1) * conversationsPerPage;
  const endIndex = startIndex + conversationsPerPage;
  const currentConversations = filteredConversations.slice(startIndex, endIndex);

  // Reset página quando filtro muda
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const formatTimestamp = useCallback((timestamp: string) => {
    if (!timestamp || timestamp === 'Invalid Date') return '';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleString('pt-BR');
    } catch {
      return '';
    }
  }, []);

  // Função para detectar e renderizar imagens
  const renderMessageContent = useCallback((content: string) => {
    // Regex para detectar URLs de imagem da Amazon S3
    const imageUrlRegex = /https:\/\/sfmediastrg\.s3\.amazonaws\.com\/[^\s]+\.(jpg|jpeg|png|gif|webp)/gi;
    const imageUrls = content.match(imageUrlRegex);
    
    if (imageUrls && imageUrls.length > 0) {
      const textWithoutImages = content.replace(imageUrlRegex, '').trim();
      return (
        <div className="space-y-2">
          {textWithoutImages && (
            <p className="text-sm leading-relaxed">
              {textWithoutImages}
            </p>
          )}
          <div className="grid gap-2">
            {imageUrls.map((url, index) => (
              <div key={index} className="relative group">
                <img 
                  src={url}
                  alt="Imagem compartilhada"
                  className="max-w-full h-auto rounded-lg border border-purple-500/30 cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ maxHeight: '300px', objectFit: 'contain' }}
                  onClick={() => window.open(url, '_blank')}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-black/50 rounded px-2 py-1 text-xs text-white">
                    Clique para ampliar
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    return (
      <p className="text-sm leading-relaxed">
        {content}
      </p>
    );
  }, []);

  // O restante do componente (o return com o JSX) continua exatamente o mesmo
  return (
    <div className="h-screen flex bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950" style={{backgroundColor: '#0f0f23'}}>
        {/* Sidebar */}
        <div className="w-80 border-r border-gray-700/40 flex flex-col bg-gradient-to-b from-gray-900/60 to-gray-800/30 backdrop-blur-sm">
            {/* Header com boas-vindas profissional */}
            <div className="p-6 border-b border-gray-700/40">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 backdrop-blur-sm flex items-center justify-center p-2 shadow-lg border border-blue-400/30">
                            <img src="/img/logo.png" alt="Talka Logo" className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white flex items-center gap-2">
                                Talka Analytics
                            </h1>
                            <p className="text-xs text-gray-400">Análise Inteligente de Conversas</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={() => setShowSettings(!showSettings)}
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:bg-gray-700/50 hover:text-white border border-gray-600/40 hover:border-gray-500/60"
                        >
                            <Settings className="w-4 h-4" />
                        </Button>
                        <Button
                            onClick={onLogout}
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:bg-gray-700/50 hover:text-white border border-gray-600/40 hover:border-gray-500/60"
                        >
                            <LogOut className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
                
                {/* Boas-vindas profissional */}
                <div className="bg-gradient-to-r from-gray-800/60 to-gray-700/40 rounded-xl p-4 border border-gray-600/30 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                            {getCompanyDisplayName(currentUser).charAt(0)}
                        </div>
                        <div className="flex-1">
                            <h2 className="text-white font-semibold">
                                Bem-vindo(a), {getCompanyDisplayName(currentUser)}!
                            </h2>
                            <p className="text-gray-400 text-sm">
                                {conversations.length} conversas disponíveis
                                {searchTerm && ` • ${filteredConversations.length} filtradas`}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Upload Section */}
            <div className="p-4 border-b border-gray-700/40">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                />
                <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border border-blue-500/40 shadow-lg"
                    variant="outline"
                >
                    <Upload className="w-4 h-4 mr-2" />
                    {isUploading ? 'Enviando...' : 'Importar Nova Conversa'}
                </Button>
            </div>

            {/* Settings Panel */}
            {showSettings && (
              <div className="p-4 border-b border-gray-700/40 bg-gray-800/30">
                <h3 className="text-white font-medium mb-3 text-sm">⚙️ Configurações</h3>
                <div className="space-y-2">
                  <Button
                    onClick={() => setShowDeleteModal(true)}
                    variant="outline"
                    size="sm"
                    className="w-full text-red-400 border-red-500/50 hover:bg-red-500/20 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Apagar Todas as Conversas
                  </Button>
                </div>
              </div>
            )}

            {/* Search */}
            <div className="p-4 border-b border-gray-700/40">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                        placeholder="Pesquisar conversas..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-gray-800/50 border-gray-600/50 text-white placeholder:text-gray-400 focus:border-blue-500/60 backdrop-blur-sm"
                    />
                </div>
            </div>

            {/* Conversations List */}
            <ScrollArea className="flex-1">
                <div className="p-2">
                    {isFetching || isLoadingAfterUpload ? (
                        <div className="text-center py-8">
                            <div className="flex flex-col items-center">
                                <div className="w-8 h-8 border-4 border-gray-600/40 border-t-blue-500 rounded-full animate-spin mb-3"></div>
                                <p className="text-gray-400 text-sm">
                                    {isLoadingAfterUpload ? 'Atualizando conversas...' : 'Carregando conversas...'}
                                </p>
                            </div>
                        </div>
                    ) : currentConversations.map((conversation) => (
                    <Card
                        key={conversation.id}
                        className={`p-4 mb-2 cursor-pointer transition-all hover:shadow-md border-gray-700/40 bg-gray-800/30 hover:bg-gray-700/40 relative group ${
                        selectedConversation?.id === conversation.id 
                            ? 'ring-2 ring-blue-500/60 bg-gray-700/50 border-blue-500/40' 
                            : ''
                        }`}
                        onClick={() => setSelectedConversation(conversation)}
                    >
                        {/* Menu de 3 pontinhos */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute top-2 right-2 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-200 hover:bg-gray-600/30"
                              onClick={(e) => e.stopPropagation()} // Evita selecionar a conversa
                            >
                              <MoreVertical className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-gray-800/95 border-gray-600/60">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteConversation(conversation.id);
                              }}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/20 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3 mr-2" />
                              Excluir conversa
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-sm truncate flex-1 text-white pr-8">
                            {conversation.title || 'Conversa sem título'}
                        </h3>
                        </div>
                        <p className="text-xs text-gray-400 mb-2 truncate">
                        {conversation.lastMessage || 'Nenhuma mensagem'}
                        </p>
                        <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs border-gray-600/50 text-gray-300">
                            <MessageCircle className="w-3 h-3 mr-1" />
                            {conversation.messageCount || conversation.messages?.length || 0}
                            </Badge>
                        </div>
                        <span className="text-xs text-gray-500">
                            {conversation.lastTimestamp && conversation.lastTimestamp !== 'Invalid Date' 
                              ? new Date(conversation.lastTimestamp).toLocaleDateString('pt-BR') 
                              : ''}
                        </span>
                        </div>
                    </Card>
                    ))}
                    
                    {!isFetching && conversations.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50 text-gray-500" />
                        <p className="text-white">Nenhuma conversa encontrada</p>
                        <p className="text-sm text-gray-400">Importe um arquivo CSV para começar</p>
                    </div>
                    )}
                    
                    {!isFetching && filteredConversations.length === 0 && conversations.length > 0 && (
                    <div className="text-center py-8 text-gray-400">
                        <Search className="w-12 h-12 mx-auto mb-4 opacity-50 text-gray-500" />
                        <p className="text-white">Nenhuma conversa encontrada</p>
                        <p className="text-sm text-gray-400">Tente pesquisar com outros termos</p>
                    </div>
                    )}
                </div>
                
                {/* Paginação */}
                {totalPages > 1 && (
                  <div className="p-4 border-t border-gray-700/40">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-400">
                        Página {currentPage} de {totalPages} • {filteredConversations.length} conversas
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          variant="outline"
                          size="sm"
                          className="text-gray-400 border-gray-600/50 hover:bg-gray-700/40 disabled:opacity-50"
                        >
                          ←
                        </Button>
                        <span className="text-xs text-gray-300 px-2">
                          {currentPage}
                        </span>
                        <Button
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          variant="outline"
                          size="sm"
                          className="text-gray-400 border-gray-600/50 hover:bg-gray-700/40 disabled:opacity-50"
                        >
                          →
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
            </ScrollArea>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col bg-gray-900/20 backdrop-blur-sm">
            {selectedConversation ? (
            <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-700/40 bg-gray-800/30 backdrop-blur-sm flex items-center justify-between">
                <div>
                    <h2 className="font-semibold text-white">{selectedConversation.title}</h2>
                    <p className="text-sm text-gray-400">
                    {selectedConversation.messageCount || selectedConversation.messages?.length || 0} mensagens
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-gray-600/50 text-gray-300">
                    <Calendar className="w-3 h-3 mr-1" />
                    {selectedConversation.messages && selectedConversation.messages.length > 0 
                      ? formatTimestamp(selectedConversation.messages[selectedConversation.messages.length - 1].timestamp) 
                      : 'Data não disponível'}
                    </Badge>
                </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 bg-gray-900/10">
                <div className="p-6 space-y-4">
                    {(selectedConversation.messages || []).map((message) => (
                    <div key={message.id} className="animate-fade-in group">
                        <div className={`flex ${message.fromMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] ${message.fromMe ? 'order-2' : 'order-1'}`}>
                            <div className={`flex items-center gap-2 mb-1 ${message.fromMe ? 'justify-end' : 'justify-start'}`}>
                            <span className="text-xs text-gray-400">
                                {formatTimestamp(message.timestamp)}
                            </span>
                            <span className="text-sm font-medium text-gray-300">
                                {message.sender}
                            </span>
                            </div>
                            <div className={`relative p-3 rounded-lg shadow-sm ${
                            message.fromMe 
                                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white ml-4 border border-blue-500/40' 
                                : 'bg-gray-800/50 border border-gray-600/50 mr-4 text-gray-100 backdrop-blur-sm'
                            }`}>
                            <div className={message.fromMe ? 'text-white' : 'text-gray-100'}>
                                {renderMessageContent(message.content)}
                            </div>
                            
                            {/* Dropdown menu para excluir mensagem */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={`absolute top-2 right-2 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity ${
                                    message.fromMe 
                                      ? 'text-white/70 hover:text-white hover:bg-white/10' 
                                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-600/20'
                                  }`}
                                >
                                  <MoreVertical className="w-3 h-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-gray-800/95 border-gray-600/60">
                                <DropdownMenuItem
                                  onClick={() => handleDeleteMessage(message.id, selectedConversation.id)}
                                  className="text-red-400 hover:text-red-300 hover:bg-red-500/20 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3 mr-2" />
                                  Excluir mensagem
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            </div>
                        </div>
                        </div>
                    </div>
                    ))}
                </div>
                </ScrollArea>
            </>
            ) : (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-900/30 to-gray-800/20">
                <div className="text-center">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-500 opacity-50" />
                <h3 className="text-lg font-medium mb-2 text-white">Selecione uma conversa</h3>
                <p className="text-gray-400">
                    Escolha uma conversa da lista para visualizar as mensagens
                </p>
                </div>
            </div>
            )}
        </div>
        
        {/* Modal de Confirmação para Deletar */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-gradient-to-br from-red-900/90 to-red-800/90 p-8 rounded-xl shadow-2xl border border-red-600/50 max-w-md w-full mx-4">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
                  <Trash2 className="w-8 h-8 text-red-400" />
                </div>
                
                <h3 className="text-xl font-semibold text-white mb-2">
                  Apagar Todas as Conversas?
                </h3>
                
                <p className="text-red-200 mb-6 text-sm leading-relaxed">
                  Esta ação irá <strong>remover permanentemente</strong> todas as suas conversas e mensagens. 
                  Esta operação não pode ser desfeita.
                </p>
                
                <div className="bg-red-800/30 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-2 text-red-300">
                    <span className="text-yellow-400">⚠️</span>
                    <span className="text-sm font-medium">Atenção:</span>
                  </div>
                  <p className="text-xs text-red-200 mt-1">
                    Você tem {conversations.length} conversas que serão removidas do banco de dados.
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <Button
                    onClick={() => setShowDeleteModal(false)}
                    variant="outline"
                    className="flex-1 bg-transparent border-gray-500/40 text-gray-300 hover:bg-gray-500/20 hover:text-white"
                    disabled={isDeletingData}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleClearData}
                    disabled={isDeletingData}
                    className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-red-500/30"
                  >
                    {isDeletingData ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Apagando...
                      </div>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Confirmar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Modal de Progresso do Upload */}
        {isUploading && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-8 rounded-xl shadow-2xl border border-gray-600/60 max-w-md w-full mx-4">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 relative">
                  <div className="absolute inset-0 border-4 border-gray-600/40 rounded-full"></div>
                  <div 
                    className="absolute inset-0 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"
                    style={{
                      animationDuration: '1.5s'
                    }}
                  ></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-gray-300 font-bold text-sm">
                      {uploadProgress.total > 0 ? Math.round((uploadProgress.current / uploadProgress.total) * 100) : 0}%
                    </span>
                  </div>
                </div>
                
                <h3 className="text-xl font-semibold text-white mb-2">
                  Processando arquivo CSV...
                </h3>
                
                <p className="text-gray-300 mb-4 text-sm leading-relaxed">
                  {uploadProgress.message || 'Enviando arquivo para o servidor...'}
                </p>
                
                {uploadProgress.total > 0 && (
                  <div className="w-full bg-gray-700/60 rounded-full h-3 mb-4">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                    ></div>
                  </div>
                )}
                
                {/* Estatísticas simplificadas */}
                <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
                  <div className="text-xs text-gray-400 mb-2">Sistema Otimizado</div>
                  <div className="flex justify-center items-center space-x-4 text-xs">
                    <div className="text-center">
                      <div className="text-white font-semibold">Upload Direto</div>
                      <div className="text-gray-400">Sem limites</div>
                    </div>
                    <div className="w-1 h-6 bg-gray-600/60"></div>
                    <div className="text-center">
                      <div className="text-white font-semibold">Processamento</div>
                      <div className="text-gray-400">Em lote</div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 text-xs text-gray-500">
                  ⚡ Sem limites de tamanho • Processamento otimizado
                </div>
                
                {/* Indicador de atividade */}
                <div className="flex items-center justify-center mt-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.3s'}}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.6s'}}></div>
                  </div>
                  <span className="ml-2 text-xs text-gray-400">Aguarde...</span>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default ChatHistoryViewer;