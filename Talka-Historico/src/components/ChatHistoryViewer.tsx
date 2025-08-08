import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, Search, MessageCircle, Users, Calendar, FileText, LogOut } from 'lucide-react';
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
    }
  }, [currentUserId]);

  // Busca as conversas quando o componente carrega
  useEffect(() => {
    if (currentUserId) {
        fetchConversations();
    }
  }, [currentUserId, fetchConversations]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('📁 File selected:', {
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
      console.error('❌ File validation failed: Not a CSV file');
      toast({
        title: "Erro no arquivo",
        description: "Por favor, selecione apenas arquivos CSV (.csv).",
        variant: "destructive"
      });
      return;
    }

    // Log do arquivo sem limite de tamanho
    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
    console.log('📊 File size check:', {
      fileSize: file.size,
      sizeMB: sizeMB
    });
    
    // Aviso para arquivos muito grandes (mas não bloqueia)
    if (file.size > 50 * 1024 * 1024) { // 50MB
      toast({
        title: "Arquivo grande detectado",
        description: `Arquivo de ${sizeMB}MB pode levar vários minutos para processar. Aguarde...`,
        duration: 5000
      });
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
      
      // Envia o CSV diretamente para a API com timeout longo para arquivos grandes
      const controller = new AbortController();
      const timeoutMinutes = Math.max(5, Math.ceil(file.size / (1024 * 1024))); // 1 minuto por MB, mínimo 5 min
      const timeoutMs = timeoutMinutes * 60 * 1000;
      
      const timeoutId = setTimeout(() => {
        console.error(`⏰ Request timeout after ${timeoutMinutes} minutes`);
        controller.abort();
      }, timeoutMs);
      
      toast({
        title: "Processando...",
        description: `Enviando ${sizeMB}MB. Timeout em ${timeoutMinutes} minutos. Aguarde...`,
        duration: 10000
      });
      
      console.log('🌐 Sending request to /api/upload-csv...');
      const requestStart = Date.now();
      
      const response = await fetch('/api/upload-csv', {
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
        responseTime: `${requestTime}ms`,
        headers: Object.fromEntries(response.headers.entries())
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
          console.error('� Error response data:', errorData);
        } catch (parseError) {
          console.error('❌ Failed to parse error response:', parseError);
          const responseText = await response.text();
          console.error('❌ Raw error response:', responseText.substring(0, 500));
        }
        
        if (response.status === 413) {
          errorMessage = `❌ ARQUIVO MUITO GRANDE PARA O VERCEL\n\n` +
                        `O arquivo de ${sizeMB}MB excedeu o limite da plataforma.\n\n` +
                        `SOLUÇÕES:\n` +
                        `• Use um servidor próprio sem limites\n` +
                        `• Divida o CSV em partes menores\n` +
                        `• Processe localmente primeiro\n\n` +
                        `O sistema pode processar qualquer tamanho, mas o Vercel tem limitações.`;
        } else if (response.status === 500) {
          errorMessage = `❌ ERRO NO PROCESSAMENTO\n\n` +
                        `Detalhes: ${errorData.details || errorData.message || 'Erro desconhecido'}\n\n` +
                        `Possíveis causas:\n` +
                        `• Problema na configuração do Supabase\n` +
                        `• Formato CSV incompatível\n` +
                        `• Timeout no processamento de arquivo grande\n\n` +
                        `Erro técnico: ${errorData.supabaseError || errorData.error || 'N/A'}`;
        } else if (response.status === 400) {
          errorMessage = `❌ PROBLEMA NO ARQUIVO CSV\n\n` +
                        `${errorData.error || 'Formato inválido'}\n\n` +
                        `Verifique se:\n` +
                        `• O arquivo tem as colunas corretas (chat_id, text, type)\n` +
                        `• Não está corrompido\n` +
                        `• Está em formato CSV válido\n` +
                        `• Tem dados além do cabeçalho`;
        } else {
          errorMessage = `❌ ERRO DESCONHECIDO (${response.status})\n\n` +
                        `${errorData.error || errorData.message || response.statusText}\n\n` +
                        `Status: ${response.status}\n` +
                        `Tamanho do arquivo: ${sizeMB}MB\n` +
                        `Detalhes: ${JSON.stringify(errorData, null, 2)}`;
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
      
      // Atualiza a lista de conversas
      fetchConversations();
      
      toast({
        title: "Upload Concluído!",
        description: `${result.processed || 0} conversas processadas com ${result.totalMessages || 0} mensagens salvas.`,
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
    conversations.filter(conv =>
      conv.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.participants.some(p => p.toLowerCase().includes(searchTerm.toLowerCase())) ||
      conv.messages.some(m => m.content.toLowerCase().includes(searchTerm.toLowerCase()))
    ), [conversations, searchTerm]);

  const formatTimestamp = useCallback((timestamp: string) => {
    return new Date(timestamp).toLocaleString('pt-BR');
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
                    <Button
                        onClick={onLogout}
                        variant="ghost"
                        size="sm"
                        className="text-purple-200 hover:bg-purple-700/30 hover:text-white border border-purple-600/30 hover:border-purple-500/50"
                    >
                        <LogOut className="w-4 h-4" />
                    </Button>
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
                                {conversations.length} conversa{conversations.length !== 1 ? 's' : ''} disponível{conversations.length !== 1 ? 'eis' : ''}
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
                    {isFetching ? (
                        <div className="text-center py-8 text-purple-300">Carregando conversas...</div>
                    ) : filteredConversations.map((conversation) => (
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
                        <h3 className="font-medium text-sm truncate flex-1 text-white">{conversation.title}</h3>
                        <span className="text-xs text-purple-300 ml-2">
                            {formatTimestamp(conversation.lastTimestamp).split(' ')[0]}
                        </span>
                        </div>
                        <p className="text-xs text-purple-200 mb-2 truncate">
                        {conversation.lastMessage}
                        </p>
                        <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs bg-purple-700/40 text-purple-100 border-purple-600/40">
                            <Users className="w-3 h-3 mr-1" />
                            {conversation.participants.length}
                            </Badge>
                            <Badge variant="outline" className="text-xs border-purple-500/40 text-purple-200">
                            <MessageCircle className="w-3 h-3 mr-1" />
                            {conversation.messageCount}
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
                </div>
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
                    {selectedConversation.participants.join(', ')} • {selectedConversation.messageCount} mensagens
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-purple-500/40 text-purple-200">
                    <Calendar className="w-3 h-3 mr-1" />
                    {formatTimestamp(selectedConversation.lastTimestamp)}
                    </Badge>
                </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 bg-purple-900/5">
                <div className="p-6 space-y-4">
                    {selectedConversation.messages.map((message) => (
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
                            <p className={`text-sm leading-relaxed ${
                                message.fromMe ? 'text-white' : 'text-purple-100'
                            }`}>
                                {message.content}
                            </p>
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
    </div>
  );
};

export default ChatHistoryViewer;