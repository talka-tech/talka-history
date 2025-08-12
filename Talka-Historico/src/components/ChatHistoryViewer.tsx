import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AutoCompressUploader } from '@/utils/AutoCompressUploader';
import { toast } from '@/hooks/use-toast';
import { 
  Upload, 
  Search, 
  MessageCircle, 
  FileText, 
  Calendar, 
  Settings, 
  LogOut, 
  Trash2, 
  MoreVertical,
  Users
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

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
  created_at?: string; // Data de criação da conversa
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
  // 📅 Estados para filtro de data
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: '',
    enabled: false
  });
  // 📅 Estados temporários para o painel (antes de aplicar)
  const [tempDateFilter, setTempDateFilter] = useState({
    startDate: '',
    endDate: '',
    enabled: false
  });
  
  // Sistema SEM NENHUMA LIMITAÇÃO - carrega TODAS as conversas SEMPRE
  const conversationsPerPage = useMemo(() => {
    // SEMPRE mostra TODAS as conversas sem limite
    return 999999; // SEM LIMITE NUNCA
  }, []);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Instância do uploader com compressão automática
  const autoUploader = useRef(new AutoCompressUploader());

  // Função para extrair nome da empresa do username
  const getCompanyDisplayName = (username: string) => {
    // Remove espaços extras e converte para título adequado
    return username
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Estados simplificados (removendo paginação complexa)

  // Função para buscar conversas salvas da API (simplificada, sem paginação)
  const fetchConversations = useCallback(async (reset = false) => {
    if (reset) {
      setConversations([]);
    }
    
    try {
        console.log(`🚀 Carregando todas as conversas para visualização...`);
        
        const response = await fetch(`/api/conversations?userId=${currentUserId}&_=${Date.now()}`);
        
        if (!response.ok) {
            throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }
        
        const allConversations = await response.json();
        console.log(`✅ ${allConversations.length} conversas carregadas para visualização`);
        
        // 🔍 LOG DETALHADO: Analisa as primeiras 3 conversas recebidas
        console.group('🔍 ANÁLISE DETALHADA DAS CONVERSAS RECEBIDAS:');
        allConversations.slice(0, 3).forEach((conv, index) => {
          console.log(`📋 Conversa ${index + 1}:`, {
            id: conv.id,
            title: conv.title,
            created_at: conv.created_at,
            messageCount: conv.messages?.length || 0,
            firstMessage: conv.messages?.[0] ? {
              sender: conv.messages[0].sender,
              content: conv.messages[0].content?.substring(0, 50),
              fromMe: conv.messages[0].fromMe,
              timestamp: conv.messages[0].timestamp
            } : 'Nenhuma mensagem',
            participantsFound: conv.messages ? [...new Set(conv.messages.map(m => m.sender))].join(', ') : 'N/A'
          });
        });
        console.groupEnd();
        
        setConversations(allConversations);
        
    } catch (error) {
        console.error('❌ Erro ao buscar conversas:', error);
        toast({
            title: "Erro",
            description: "Não foi possível carregar o histórico de conversas.",
            variant: "destructive"
        });
    } finally {
        setIsFetching(false);
        setIsLoadingAfterUpload(false);
    }
  }, [currentUserId, toast]);

  // Função para limpar dados
  const handleClearData = useCallback(async () => {
    if (!currentUserId) return;
    
    try {
      setIsDeletingData(true);
      
      console.log('🗑️ Iniciando limpeza de dados para usuário:', currentUserId);
      
      const response = await fetch('/api/clear-data-fk', {
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
        fetchConversations(true); // Reset para carregar do início
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
        fetchConversations(true); // Reset para carregar do início
    }
  }, [currentUserId, fetchConversations]);

  // **NOVA FUNÇÃO DE UPLOAD COM COMPRESSÃO AUTOMÁTICA**
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('📁 Arquivo selecionado:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString()
    });

    // Verificar se é um arquivo CSV
    const isCSV = file.name.toLowerCase().endsWith('.csv') || 
                  file.type === 'text/csv' || 
                  file.type === 'application/csv';
    
    if (!isCSV) {
      console.error('❌ Validação falhou: não é um arquivo CSV');
      toast({
        title: "Erro no arquivo",
        description: "Por favor, selecione apenas arquivos CSV (.csv).",
        variant: "destructive"
      });
      return;
    }

    const fileSizeMB = file.size / 1024 / 1024;
    console.log('📊 Tamanho do arquivo:', {
      bytes: file.size,
      MB: fileSizeMB.toFixed(2)
    });

    setIsUploading(true);
    console.log('🚀 Iniciando processo de upload com compressão automática...');

    try {
      // Validação básica do CSV
      toast({
        title: "🔍 Validando arquivo...",
        description: "Verificando formato CSV e preparando compressão automática...",
        duration: 3000
      });

      console.log('📖 Validando estrutura do CSV...');
      const text = await file.text();
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

      console.log('✅ Validação CSV aprovada:', {
        totalLines: lines.length,
        headers: headers,
        dataLines: lines.length - 1
      });

      // Recreate file object from text (para garantir compatibilidade)
      const validatedFile = new File([text], file.name, { type: 'text/csv' });

      // Toast inicial para compressão/upload
      toast({
        title: "🗜️ Sistema de Compressão Ativo!",
        description: fileSizeMB > 1 
          ? `Arquivo de ${fileSizeMB.toFixed(2)}MB será comprimido automaticamente com pako (até 80% redução)...`
          : `Arquivo de ${fileSizeMB.toFixed(2)}MB sendo processado com compressão automática...`,
        duration: 5000
      });

      // Progress callback para feedback visual
      const progressCallback = (percent: number, message: string) => {
        setUploadProgress({
          current: percent,
          total: 100,
          message: message
        });
      };

      // Upload com compressão automática usando XMLHttpRequest
      console.log('� Iniciando upload com AutoCompressUploader...');
      const result = await autoUploader.current.handleFileUpload(
        validatedFile, 
        progressCallback, 
        currentUserId
      );

      console.log('🎉 Upload concluído com sucesso:', result);

      // 🔍 LOG DETALHADO: Analisa o resultado do upload
      console.group('🔍 ANÁLISE DO RESULTADO DO UPLOAD:');
      console.log('📊 Estatísticas:', {
        totalMessages: result.totalMessages,
        conversations: result.conversations,
        phonesIdentified: result.phonesIdentified,
        compressionRatio: result.compressionRatio,
        originalSize: result.originalSize,
        compressedSize: result.compressedSize
      });
      console.log('📋 Resultado completo:', result);
      console.groupEnd();

      // Sucesso - atualiza conversas
      setIsLoadingAfterUpload(true);
      
      // 🔍 Aguarda um pouco antes de buscar as conversas para garantir que foram salvas
      console.log('⏳ Aguardando 2 segundos antes de buscar conversas...');
      setTimeout(() => {
        console.log('🔄 Iniciando busca de conversas após upload...');
        fetchConversations(true); // Reset para carregar todas as conversas atualizadas
      }, 2000);

      const compressionMessage = fileSizeMB > 1 
        ? ' Compressão automática aplicada para máxima velocidade!'
        : '';

      toast({
        title: "🎉 Upload Concluído!",
        description: `${result.conversations || 'Várias'} conversas processadas com ${result.totalMessages || 'muitas'} mensagens! Compressão: ${result.compressionRatio || 'N/A'} redução (${result.originalSize} → ${result.compressedSize})`,
        variant: "default",
        duration: 12000
      });

    } catch (error: any) {
      console.error('❌ Erro no upload com compressão:', error);
      toast({
        title: "Erro no upload",
        description: error.message || 'Falha no processamento do arquivo',
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setUploadProgress({ current: 0, total: 0, message: '' });
      
      // Limpa o input de arquivo
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [currentUserId, fetchConversations]);

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

  // Função para normalizar números removendo formatação para busca flexível
  const normalizePhoneNumber = useCallback((phone: string): string => {
    return phone.replace(/[^\d]/g, ''); // Remove tudo que não é dígito
  }, []);

  // 📅 Funções para presets de data rápidos (estado temporário)
  const setDatePreset = useCallback((preset: 'today' | 'week' | 'month' | 'year') => {
    const today = new Date();
    const startDate = new Date();
    
    switch (preset) {
      case 'today':
        break; // startDate já é hoje
      case 'week':
        startDate.setDate(today.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(today.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(today.getFullYear() - 1);
        break;
    }
    
    setTempDateFilter({
      enabled: true,
      startDate: startDate.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    });
  }, []);

  // 📅 Função para aplicar filtro e fechar painel
  const applyDateFilter = useCallback(() => {
    setDateFilter(tempDateFilter);
    setShowSettings(false); // Fecha o painel
  }, [tempDateFilter]);

  // 📅 Função para limpar filtro
  const clearDateFilter = useCallback(() => {
    const clearedFilter = { startDate: '', endDate: '', enabled: false };
    setTempDateFilter(clearedFilter);
    setDateFilter(clearedFilter);
  }, []);

  const filteredConversations = useMemo(() => {
    let filtered = conversations;
    
    // 📅 FILTRO POR DATA primeiro
    if (dateFilter.enabled && (dateFilter.startDate || dateFilter.endDate)) {
      filtered = filtered.filter(conv => {
        if (!conv.created_at) return false;
        
        const convDate = new Date(conv.created_at);
        const startDate = dateFilter.startDate ? new Date(dateFilter.startDate) : null;
        const endDate = dateFilter.endDate ? new Date(dateFilter.endDate) : null;
        
        // Se só tem data início
        if (startDate && !endDate) {
          return convDate >= startDate;
        }
        
        // Se só tem data fim
        if (!startDate && endDate) {
          // Ajusta para fim do dia
          endDate.setHours(23, 59, 59, 999);
          return convDate <= endDate;
        }
        
        // Se tem ambas as datas
        if (startDate && endDate) {
          endDate.setHours(23, 59, 59, 999);
          return convDate >= startDate && convDate <= endDate;
        }
        
        return true;
      });
    }
    
    // 🔍 FILTRO POR BUSCA depois
    if (!searchTerm.trim()) return filtered;
    
    const searchTermLower = searchTerm.toLowerCase();
    const searchTermNumbers = normalizePhoneNumber(searchTerm);
    
    return filtered.filter(conv => {
      if (!conv) return false;
      
      // 🎯 PRIORIDADE: Busca por número de telefone (mais eficiente)
      if (searchTermNumbers.length >= 4) { // Mínimo 4 dígitos para busca de número
        const normalizedTitle = normalizePhoneNumber(conv.title || '');
        // Busca exata ou parcial no número
        if (normalizedTitle.includes(searchTermNumbers)) {
          return true;
        }
        
        // Busca em participantes (números)
        const participantMatch = conv.participants?.some(p => 
          normalizePhoneNumber(p).includes(searchTermNumbers)
        ) || false;
        
        if (participantMatch) return true;
      }
      
      // Busca textual secundária (título, participantes, mensagens)
      const titleMatch = conv.title?.toLowerCase().includes(searchTermLower) || false;
      const participantsMatch = conv.participants?.some(p => 
        p?.toLowerCase().includes(searchTermLower)
      ) || false;
      
      // Só busca em mensagens se for termo textual (não numérico)
      const messagesMatch = searchTermNumbers.length < 4 ? 
        conv.messages?.some(m => m?.content?.toLowerCase().includes(searchTermLower)) || false : false;
      
      return titleMatch || participantsMatch || messagesMatch;
    });
  }, [conversations, searchTerm, dateFilter, normalizePhoneNumber]);

  // MOSTRA TODAS AS CONVERSAS SEM LIMITAÇÃO
  const currentConversations = filteredConversations; // SEM SLICE = SEM LIMITE

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
    <div className="h-screen flex bg-gradient-to-br from-black via-gray-950 to-purple-950/30" style={{backgroundColor: '#13012a'}}>
        {/* Sidebar */}
        <div className="w-80 border-r border-purple-900/30 flex flex-col bg-gradient-to-b from-gray-950/80 to-black/60 backdrop-blur-sm">
            {/* Header com boas-vindas profissional */}
            <div className="p-6 border-b border-purple-900/40">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl backdrop-blur-sm flex items-center justify-center p-2 shadow-lg border" style={{backgroundColor: '#13012a', borderColor: '#13012a'}}>
                            <img src="/img/logo.png" alt="Talka Logo" className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white flex items-center gap-2">
                                Talka Analytics
                            </h1>
                            <p className="text-xs text-purple-300/80">Análise Inteligente de Conversas</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={() => {
                              setTempDateFilter(dateFilter); // Sincroniza estado atual
                              setShowSettings(!showSettings);
                            }}
                            variant="ghost"
                            size="sm"
                            className="text-purple-300/80 hover:bg-purple-900/40 hover:text-purple-200 border border-purple-800/50 hover:border-purple-700/60"
                        >
                            <Settings className="w-4 h-4" />
                        </Button>
                        <Button
                            onClick={onLogout}
                            variant="ghost"
                            size="sm"
                            className="text-purple-300/80 hover:bg-purple-900/40 hover:text-purple-200 border border-purple-800/50 hover:border-purple-700/60"
                        >
                            <LogOut className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
                
                {/* Boas-vindas profissional */}
                <div className="bg-gradient-to-r from-black/80 rounded-xl p-4 border backdrop-blur-sm" style={{backgroundColor: '#13012a', borderColor: '#13012a'}}>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg" style={{background: 'linear-gradient(to right, #13012a, #2d1b4e)'}}>
                            {getCompanyDisplayName(currentUser).charAt(0)}
                        </div>
                        <div className="flex-1">
                            <h2 className="text-white font-semibold">
                                Bem-vindo(a), {getCompanyDisplayName(currentUser)}!
                            </h2>
                            <p className="text-purple-300/70 text-sm">
                                {conversations.length} conversas disponíveis
                                {searchTerm && ` • ${filteredConversations.length} por busca`}
                                {dateFilter.enabled && (dateFilter.startDate || dateFilter.endDate) && 
                                  ` • ${filteredConversations.length} no período`
                                }
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Upload Section */}
            <div className="p-4 border-b border-purple-900/40">
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
                    className="w-full text-white border shadow-lg"
                    style={{background: 'linear-gradient(to right, #13012a, #2d1b4e)', borderColor: '#13012a'}}
                    variant="outline"
                >
                    <Upload className="w-4 h-4 mr-2" />
                    {isUploading ? 'Enviando...' : 'Importar Nova Conversa'}
                </Button>
            </div>

            {/* Settings Panel */}
            {showSettings && (
              <div className="p-4 border-b border-purple-900/40 bg-gradient-to-b from-black/60 to-purple-950/40 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                    ⚙️ Filtros & Configurações
                  </h3>
                  <Button
                    onClick={() => setShowSettings(false)}
                    variant="ghost"
                    size="sm"
                    className="text-purple-400/70 hover:text-purple-300 w-6 h-6 p-0"
                  >
                    ✕
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {/* Filtro de Data - Interface Melhorada */}
                  <div className="bg-black/30 rounded-lg p-4 border border-purple-800/30">
                    <div className="flex items-center gap-3 mb-3">
                      <input
                        type="checkbox"
                        id="dateFilter"
                        checked={tempDateFilter.enabled}
                        onChange={(e) => setTempDateFilter(prev => ({ ...prev, enabled: e.target.checked }))}
                        className="w-4 h-4 text-purple-600 bg-black/60 border-purple-700 rounded focus:ring-purple-500"
                      />
                      <label htmlFor="dateFilter" className="text-sm font-medium text-white flex items-center gap-2">
                        📅 Filtrar por Período
                      </label>
                      {dateFilter.enabled && (
                        <Badge variant="outline" className="text-xs border-green-600/60 text-green-400">
                          Ativo
                        </Badge>
                      )}
                    </div>
                    
                    {tempDateFilter.enabled && (
                      <div className="space-y-3">
                        {/* Inputs de Data */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-purple-300/80 block mb-1 font-medium">📅 Data Início</label>
                            <input
                              type="date"
                              value={tempDateFilter.startDate}
                              onChange={(e) => setTempDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                              className="w-full px-3 py-2 text-sm bg-black/60 border border-purple-700/60 rounded-lg text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-purple-300/80 block mb-1 font-medium">📅 Data Fim</label>
                            <input
                              type="date"
                              value={tempDateFilter.endDate}
                              onChange={(e) => setTempDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                              className="w-full px-3 py-2 text-sm bg-black/60 border border-purple-700/60 rounded-lg text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                            />
                          </div>
                        </div>
                        
                        {/* Presets Rápidos - Visual Melhorado */}
                        <div>
                          <label className="text-xs text-purple-300/80 block mb-2 font-medium">⚡ Períodos Rápidos</label>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              onClick={() => setDatePreset('today')}
                              variant="outline"
                              size="sm"
                              className="text-xs text-white bg-purple-900/30 border-purple-600/50 hover:bg-purple-800/40 hover:border-purple-500 transition-all"
                            >
                              📅 Hoje
                            </Button>
                            <Button
                              onClick={() => setDatePreset('week')}
                              variant="outline"
                              size="sm"
                              className="text-xs text-white bg-purple-900/30 border-purple-600/50 hover:bg-purple-800/40 hover:border-purple-500 transition-all"
                            >
                              📅 7 dias
                            </Button>
                            <Button
                              onClick={() => setDatePreset('month')}
                              variant="outline"
                              size="sm"
                              className="text-xs text-white bg-purple-900/30 border-purple-600/50 hover:bg-purple-800/40 hover:border-purple-500 transition-all"
                            >
                              📅 30 dias
                            </Button>
                            <Button
                              onClick={() => setDatePreset('year')}
                              variant="outline"
                              size="sm"
                              className="text-xs text-white bg-purple-900/30 border-purple-600/50 hover:bg-purple-800/40 hover:border-purple-500 transition-all"
                            >
                              📅 1 ano
                            </Button>
                          </div>
                        </div>
                        
                        {/* Botões de Ação - Destaque */}
                        <div className="flex gap-2 pt-2">
                          <Button
                            onClick={applyDateFilter}
                            className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white border-green-500/30 font-medium"
                            size="sm"
                          >
                            ✅ Aplicar Filtro
                          </Button>
                          <Button
                            onClick={clearDateFilter}
                            variant="outline"
                            size="sm"
                            className="text-purple-400 border-purple-700/40 hover:bg-purple-800/20"
                          >
                            🗑️ Limpar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Seção de Danger Zone */}
                  <div className="bg-red-900/20 rounded-lg p-4 border border-red-800/30">
                    <h4 className="text-red-300 font-medium text-sm mb-2 flex items-center gap-2">
                      ⚠️ Zona de Perigo
                    </h4>
                    <Button
                      onClick={() => {
                        setShowDeleteModal(true);
                        setShowSettings(false);
                      }}
                      variant="outline"
                      size="sm"
                      className="w-full text-red-400 border-red-600/60 hover:bg-red-500/20 hover:text-red-300 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Apagar Todas as Conversas
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Search */}
            <div className="p-4 border-b border-purple-900/40">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400/70 w-4 h-4" />
                    <Input
                        placeholder="Digite o número..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-black/60 border-purple-800/60 text-white placeholder:text-purple-400/60 focus:border-purple-600/80 backdrop-blur-sm"
                    />
                </div>
            </div>

            {/* Conversations List */}
            <ScrollArea className="flex-1">
                <div className="p-2">
                    {isFetching || isLoadingAfterUpload ? (
                        <div className="text-center py-8">
                            <div className="flex flex-col items-center">
                                <div className="w-8 h-8 border-4 border-purple-900/50 border-t-purple-500 rounded-full animate-spin mb-3"></div>
                                <p className="text-purple-300/70 text-sm">
                                    {isLoadingAfterUpload ? 'Atualizando conversas...' : 'Carregando conversas...'}
                                </p>
                            </div>
                        </div>
                    ) : currentConversations.map((conversation) => (
                    <Card
                        key={conversation.id}
                        className={`p-4 mb-2 cursor-pointer transition-all hover:shadow-md border-purple-900/40 bg-black/40 hover:bg-purple-950/40 relative group ${
                        selectedConversation?.id === conversation.id 
                            ? 'ring-2 ring-purple-600/70 bg-purple-900/30 border-purple-600/60' 
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
                              className="absolute top-2 right-2 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-purple-400/70 hover:text-purple-300 hover:bg-purple-800/30"
                              onClick={(e) => e.stopPropagation()} // Evita selecionar a conversa
                            >
                              <MoreVertical className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-black/95 border-purple-800/70">
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
                        <p className="text-xs text-purple-300/60 mb-2 truncate">
                        {conversation.lastMessage || 'Nenhuma mensagem'}
                        </p>
                        <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs border-purple-700/60 text-purple-300">
                            <MessageCircle className="w-3 h-3 mr-1" />
                            {conversation.messageCount || conversation.messages?.length || 0}
                            </Badge>
                        </div>
                        <span className="text-xs text-purple-400/50">
                            {conversation.created_at 
                              ? new Date(conversation.created_at).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit', 
                                  year: 'numeric'
                                })
                              : conversation.lastTimestamp && conversation.lastTimestamp !== 'Invalid Date' 
                                ? new Date(conversation.lastTimestamp).toLocaleDateString('pt-BR')
                                : ''}
                        </span>
                        </div>
                    </Card>
                    ))}
                    
                    {!isFetching && conversations.length === 0 && (
                    <div className="text-center py-8 text-purple-300/70">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50 text-purple-400/60" />
                        <p className="text-white">Nenhuma conversa encontrada</p>
                        <p className="text-sm text-purple-300/60">Importe um arquivo CSV para começar</p>
                    </div>
                    )}
                    
                    {!isFetching && filteredConversations.length === 0 && conversations.length > 0 && (
                    <div className="text-center py-8 text-purple-300/70">
                        <Search className="w-12 h-12 mx-auto mb-4 opacity-50 text-purple-400/60" />
                        <p className="text-white">Nenhum resultado encontrado</p>
                        <p className="text-sm text-purple-300/60">Digite um número específico: (71) 9644-0261</p>
                    </div>
                    )}
                    
                    {/* Dica quando há muitas conversas mas não há busca */}
                    {!isFetching && !searchTerm.trim() && conversations.length > 100 && (
                    <div className="mx-2 mb-4 p-3 bg-purple-900/20 border border-purple-800/30 rounded-lg">
                        <div className="flex items-center gap-2 text-purple-300 text-xs">
                            <Search className="w-4 h-4" />
                            <span>💡 Com {conversations.length} conversas, use a busca para encontrar números específicos!</span>
                        </div>
                    </div>
                    )}
                </div>
            </ScrollArea>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col bg-black/20 backdrop-blur-sm">
            {selectedConversation ? (
            <>
                {/* Chat Header */}
                <div className="p-4 border-b border-purple-900/40 bg-black/50 backdrop-blur-sm flex items-center justify-between">
                <div>
                    <h2 className="font-semibold text-white">{selectedConversation.title}</h2>
                    <p className="text-sm text-purple-300/70">
                    {selectedConversation.messageCount || selectedConversation.messages?.length || 0} mensagens
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-purple-700/60 text-purple-300">
                    <Calendar className="w-3 h-3 mr-1" />
                    {selectedConversation.messages && selectedConversation.messages.length > 0 
                      ? formatTimestamp(selectedConversation.messages[selectedConversation.messages.length - 1].timestamp) 
                      : 'Data não disponível'}
                    </Badge>
                </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 bg-black/10">
                <div className="p-6 space-y-4">
                    {(selectedConversation.messages || []).map((message) => (
                    <div key={message.id} className="animate-fade-in group">
                        <div className={`flex ${message.fromMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] ${message.fromMe ? 'order-2' : 'order-1'}`}>
                            <div className={`flex items-center gap-2 mb-1 ${message.fromMe ? 'justify-end' : 'justify-start'}`}>
                            <span className="text-xs text-purple-400/70">
                                {formatTimestamp(message.timestamp)}
                            </span>
                            <span className="text-sm font-medium text-purple-300">
                                {message.sender}
                            </span>
                            </div>
                            <div className={`relative p-3 rounded-lg shadow-sm ${
                            message.fromMe 
                                ? 'bg-gradient-to-r from-purple-700 to-purple-800 text-white ml-4 border border-purple-600/50' 
                                : 'bg-black/60 border border-purple-800/60 mr-4 text-purple-100 backdrop-blur-sm'
                            }`}>
                            <div className={message.fromMe ? 'text-white' : 'text-purple-100'}>
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
                                      : 'text-purple-400/70 hover:text-purple-300 hover:bg-purple-800/30'
                                  }`}
                                >
                                  <MoreVertical className="w-3 h-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-black/95 border-purple-800/70">
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
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-black/50 to-purple-950/30">
                <div className="text-center">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 text-purple-500/60 opacity-50" />
                <h3 className="text-lg font-medium mb-2 text-white">Selecione uma conversa</h3>
                <p className="text-purple-300/70">
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
                    className="flex-1 bg-transparent border-purple-700/40 text-purple-300 hover:bg-purple-800/20 hover:text-white"
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
            <div className="bg-gradient-to-br from-black/95 to-purple-950/90 p-8 rounded-xl shadow-2xl border border-purple-800/50 max-w-md w-full mx-4">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 relative">
                  <div className="absolute inset-0 border-4 border-purple-900/40 rounded-full"></div>
                  <div 
                    className="absolute inset-0 border-4 border-transparent border-t-purple-500 rounded-full animate-spin"
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
                  🗜️ Compressão + Processamento Ativo...
                </h3>
                
                <p className="text-purple-300/70 mb-4 text-sm leading-relaxed">
                  {uploadProgress.message || 'Comprimindo arquivo com pako para máxima eficiência...'}
                </p>
                
                {uploadProgress.total > 0 && (
                  <div className="w-full bg-purple-950/60 rounded-full h-3 mb-4">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-purple-600 h-3 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                    ></div>
                  </div>
                )}
                
                {/* Informações sobre processamento direto */}
                <div className="bg-black/50 rounded-lg p-4 mb-4 border border-purple-800/30">
                  <div className="text-xs text-purple-400/70 mb-2">Compressão Pako + Supabase Direto</div>
                  <div className="flex justify-center items-center space-x-4 text-xs">
                    <div className="text-center">
                      <div className="text-white font-semibold">Compressão</div>
                      <div className="text-green-300/70">Pako (até 80%)</div>
                    </div>
                    <div className="w-1 h-6 bg-purple-800/60"></div>
                    <div className="text-center">
                      <div className="text-white font-semibold">Processamento</div>
                      <div className="text-green-300/70">Frontend</div>
                    </div>
                    <div className="w-1 h-6 bg-purple-800/60"></div>
                    <div className="text-center">
                      <div className="text-white font-semibold">Upload</div>
                      <div className="text-green-300/70">Supabase</div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 text-xs text-green-400/80">
                  ⚡ Compressão real com pako • Processamento frontend • Conexão direta Supabase
                </div>
                
                {/* Indicador de atividade */}
                <div className="flex items-center justify-center mt-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{animationDelay: '0.3s'}}></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{animationDelay: '0.6s'}}></div>
                  </div>
                  <span className="ml-2 text-xs text-purple-400/70">Aguarde...</span>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default ChatHistoryViewer;