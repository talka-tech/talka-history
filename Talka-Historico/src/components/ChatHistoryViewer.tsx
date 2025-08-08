import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, Search, MessageCircle, Users, Calendar, FileText, LogOut, Settings, Trash2 } from 'lucide-react';
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
  const [visibleConversations, setVisibleConversations] = useState(10); // Para carregamento lazy
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

    // Verificar o tamanho do arquivo (máximo 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    console.log('📊 File size check:', {
      fileSize: file.size,
      maxSize: maxSize,
      sizeMB: (file.size / 1024 / 1024).toFixed(2)
    });
    
    if (file.size > maxSize) {
      console.error('❌ File too large:', file.size);
      toast({
        title: "Arquivo muito grande",
        description: `O arquivo tem ${(file.size / 1024 / 1024).toFixed(2)}MB. Máximo permitido: 50MB.`,
        variant: "destructive"
      });
      return;
    }

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
    setVisibleConversations(10); // Reset carregamento lazy também
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
    <div className="h-screen flex bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900" style={{backgroundColor: '#12032d'}}>
        {/* Sidebar */}
        <div className="w-80 border-r border-purple-600/30 flex flex-col bg-gradient-to-b from-purple-900/40 to-purple-800/20 backdrop-blur-sm">
            {/* Header com boas-vindas profissional */}
            <div className="p-6 border-b border-purple-600/30">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-200/40 backdrop-blur-sm flex items-center justify-center p-2 shadow-lg border border-purple-300/50">
                            <img src="/img/logo.png" alt="Talka Logo" className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white flex items-center gap-2">
                                Talka Analytics
                            </h1>
                            <p className="text-xs text-purple-200">Análise Inteligente de Conversas</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={() => setShowSettings(!showSettings)}
                            variant="ghost"
                            size="sm"
                            className="text-purple-200 hover:bg-purple-700/30 hover:text-white border border-purple-600/30 hover:border-purple-500/50"
                        >
                            <Settings className="w-4 h-4" />
                        </Button>
                        <Button
                            onClick={onLogout}
                            variant="ghost"
                            size="sm"
                            className="text-purple-200 hover:bg-purple-700/30 hover:text-white border border-purple-600/30 hover:border-purple-500/50"
                        >
                            <LogOut className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
                
                {/* Boas-vindas profissional */}
                <div className="bg-gradient-to-r from-purple-800/40 to-purple-700/30 rounded-xl p-4 border border-purple-600/20 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                            {getCompanyDisplayName(currentUser).charAt(0)}
                        </div>
                        <div className="flex-1">
                            <h2 className="text-white font-semibold">
                                Bem-vindo(a), {getCompanyDisplayName(currentUser)}!
                            </h2>
                            <p className="text-purple-200 text-sm">
                                {conversations.length} conversas disponíveis
                                {searchTerm && ` • ${filteredConversations.length} filtradas`}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Upload Section */}
            <div className="p-4 border-b border-purple-600/30">
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
                    className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white border border-purple-500/30"
                    variant="outline"
                >
                    <Upload className="w-4 h-4 mr-2" />
                    {isUploading ? 'Enviando...' : 'Importar Nova Conversa'}
                </Button>
            </div>

            {/* Settings Panel */}
            {showSettings && (
              <div className="p-4 border-b border-purple-600/30 bg-purple-800/20">
                <h3 className="text-white font-medium mb-3 text-sm">⚙️ Configurações</h3>
                <div className="space-y-2">
                  <Button
                    onClick={() => setShowDeleteModal(true)}
                    variant="outline"
                    size="sm"
                    className="w-full text-red-300 border-red-500/40 hover:bg-red-500/20 hover:text-red-200"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Apagar Todas as Conversas
                  </Button>
                </div>
              </div>
            )}

            {/* Search */}
            <div className="p-4 border-b border-purple-600/30">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-300 w-4 h-4" />
                    <Input
                        placeholder="Pesquisar conversas..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-purple-900/30 border-purple-600/40 text-white placeholder:text-purple-300 focus:border-purple-400 backdrop-blur-sm"
                    />
                </div>
            </div>

            {/* Conversations List */}
            <ScrollArea className="flex-1">
                <div className="p-2">
                    {isFetching || isLoadingAfterUpload ? (
                        <div className="text-center py-8">
                            <div className="flex flex-col items-center">
                                <div className="w-8 h-8 border-4 border-purple-600/30 border-t-purple-400 rounded-full animate-spin mb-3"></div>
                                <p className="text-purple-300 text-sm">
                                    {isLoadingAfterUpload ? 'Atualizando conversas...' : 'Carregando conversas...'}
                                </p>
                            </div>
                        </div>
                    ) : currentConversations.map((conversation) => (
                    <Card
                        key={conversation.id}
                        className={`p-4 mb-2 cursor-pointer transition-all hover:shadow-md border-purple-600/30 bg-purple-800/20 hover:bg-purple-700/30 ${
                        selectedConversation?.id === conversation.id 
                            ? 'ring-2 ring-purple-400 bg-purple-700/40 border-purple-400/50' 
                            : ''
                        }`}
                        onClick={() => setSelectedConversation(conversation)}
                    >
                        <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-sm truncate flex-1 text-white">
                            {conversation.title || 'Conversa sem título'}
                        </h3>
                        <span className="text-xs text-purple-300 ml-2">
                            {conversation.lastTimestamp && conversation.lastTimestamp !== 'Invalid Date' 
                              ? formatTimestamp(conversation.lastTimestamp).split(' ')[0] 
                              : ''}
                        </span>
                        </div>
                        <p className="text-xs text-purple-200 mb-2 truncate">
                        {conversation.lastMessage || 'Nenhuma mensagem'}
                        </p>
                        <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs bg-purple-700/40 text-purple-100 border-purple-600/40">
                            <Users className="w-3 h-3 mr-1" />
                            {conversation.participants?.length || 0}
                            </Badge>
                            <Badge variant="outline" className="text-xs border-purple-500/40 text-purple-200">
                            <MessageCircle className="w-3 h-3 mr-1" />
                            {conversation.messageCount || conversation.messages?.length || 0}
                            </Badge>
                        </div>
                        </div>
                    </Card>
                    ))}
                    
                    {!isFetching && conversations.length === 0 && (
                    <div className="text-center py-8 text-purple-300">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50 text-purple-400" />
                        <p className="text-white">Nenhuma conversa encontrada</p>
                        <p className="text-sm text-purple-300">Importe um arquivo CSV para começar</p>
                    </div>
                    )}
                    
                    {!isFetching && filteredConversations.length === 0 && conversations.length > 0 && (
                    <div className="text-center py-8 text-purple-300">
                        <Search className="w-12 h-12 mx-auto mb-4 opacity-50 text-purple-400" />
                        <p className="text-white">Nenhuma conversa encontrada</p>
                        <p className="text-sm text-purple-300">Tente pesquisar com outros termos</p>
                    </div>
                    )}
                    
                    {/* Botão carregar mais (carregamento lazy) */}
                    {!isFetching && currentConversations.length > 0 && currentPage < totalPages && (
                      <div className="p-4 text-center">
                        <Button
                          onClick={() => setCurrentPage(prev => prev + 1)}
                          variant="outline"
                          size="sm"
                          className="text-purple-300 border-purple-500/40 hover:bg-purple-500/20"
                        >
                          Carregar próxima página ({currentPage + 1} de {totalPages})
                        </Button>
                      </div>
                    )}
                </div>
                
                {/* Info de paginação simplificada */}
                {totalPages > 1 && (
                  <div className="p-4 border-t border-purple-600/30">
                    <div className="text-center">
                      <p className="text-xs text-purple-300">
                        Página {currentPage} de {totalPages} • {filteredConversations.length} conversas
                      </p>
                    </div>
                  </div>
                )}
            </ScrollArea>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col bg-purple-900/10 backdrop-blur-sm">
            {selectedConversation ? (
            <>
                {/* Chat Header */}
                <div className="p-4 border-b border-purple-600/30 bg-purple-800/20 backdrop-blur-sm flex items-center justify-between">
                <div>
                    <h2 className="font-semibold text-white">{selectedConversation.title}</h2>
                    <p className="text-sm text-purple-200">
                    {selectedConversation.participants?.length > 0 ? selectedConversation.participants.join(', ') : 'Sem participantes'} • {selectedConversation.messageCount || selectedConversation.messages?.length || 0} mensagens
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-purple-500/40 text-purple-200">
                    <Calendar className="w-3 h-3 mr-1" />
                    {selectedConversation.lastTimestamp && selectedConversation.lastTimestamp !== 'Invalid Date' 
                      ? formatTimestamp(selectedConversation.lastTimestamp) 
                      : 'Data não disponível'}
                    </Badge>
                </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 bg-purple-900/5">
                <div className="p-6 space-y-4">
                    {(selectedConversation.messages || []).map((message) => (
                    <div key={message.id} className="animate-fade-in">
                        <div className={`flex ${message.fromMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] ${message.fromMe ? 'order-2' : 'order-1'}`}>
                            <div className={`flex items-center gap-2 mb-1 ${message.fromMe ? 'justify-end' : 'justify-start'}`}>
                            <span className="text-xs text-purple-300">
                                {formatTimestamp(message.timestamp)}
                            </span>
                            <span className="text-sm font-medium text-purple-100">
                                {message.sender}
                            </span>
                            </div>
                            <div className={`p-3 rounded-lg shadow-sm ${
                            message.fromMe 
                                ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white ml-4 border border-purple-500/30' 
                                : 'bg-purple-800/30 border border-purple-600/40 mr-4 text-purple-100 backdrop-blur-sm'
                            }`}>
                            <div className={message.fromMe ? 'text-white' : 'text-purple-100'}>
                                {renderMessageContent(message.content)}
                            </div>
                            </div>
                        </div>
                        </div>
                    </div>
                    ))}
                </div>
                </ScrollArea>
            </>
            ) : (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-purple-900/20 to-purple-800/10">
                <div className="text-center">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 text-purple-400 opacity-50" />
                <h3 className="text-lg font-medium mb-2 text-white">Selecione uma conversa</h3>
                <p className="text-purple-200">
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
            <div className="bg-gradient-to-br from-purple-900 to-purple-800 p-8 rounded-xl shadow-2xl border border-purple-600/50 max-w-md w-full mx-4">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 relative">
                  <div className="absolute inset-0 border-4 border-purple-600/30 rounded-full"></div>
                  <div 
                    className="absolute inset-0 border-4 border-transparent border-t-purple-400 rounded-full animate-spin"
                    style={{
                      animationDuration: '1.5s'
                    }}
                  ></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-purple-300 font-bold text-sm">
                      {uploadProgress.total > 0 ? Math.round((uploadProgress.current / uploadProgress.total) * 100) : 0}%
                    </span>
                  </div>
                </div>
                
                <h3 className="text-xl font-semibold text-white mb-2">
                  Processando arquivo CSV...
                </h3>
                
                <p className="text-purple-200 mb-4 text-sm leading-relaxed">
                  {uploadProgress.message || 'Enviando arquivo para o servidor...'}
                </p>
                
                {uploadProgress.total > 0 && (
                  <div className="w-full bg-purple-900/50 rounded-full h-3 mb-4">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-purple-400 h-3 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                    ></div>
                  </div>
                )}
                
                {/* Estatísticas simplificadas */}
                <div className="bg-purple-800/30 rounded-lg p-4 mb-4">
                  <div className="text-xs text-purple-300 mb-2">Sistema Otimizado</div>
                  <div className="flex justify-center items-center space-x-4 text-xs">
                    <div className="text-center">
                      <div className="text-white font-semibold">Upload Direto</div>
                      <div className="text-purple-400">Sem chunks</div>
                    </div>
                    <div className="w-1 h-6 bg-purple-600/50"></div>
                    <div className="text-center">
                      <div className="text-white font-semibold">Processamento</div>
                      <div className="text-purple-400">Em lote</div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 text-xs text-purple-400">
                  ⚡ Arquitetura simplificada • Processamento otimizado
                </div>
                
                {/* Indicador de atividade */}
                <div className="flex items-center justify-center mt-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{animationDelay: '0.3s'}}></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{animationDelay: '0.6s'}}></div>
                  </div>
                  <span className="ml-2 text-xs text-purple-300">Aguarde...</span>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default ChatHistoryViewer;