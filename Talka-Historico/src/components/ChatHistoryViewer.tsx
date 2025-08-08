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

    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Erro no arquivo",
        description: "Por favor, selecione um arquivo CSV.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    
    try {
      const text = await file.text();
      
      // Envia o CSV diretamente para a API (não processado)
      const response = await fetch('/api/upload-csv', {
        method: 'POST',
        headers: { 
          'Content-Type': 'text/plain',
          'x-user-id': currentUserId.toString()
        },
        body: text
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao salvar o histórico.');
      }

      const result = await response.json();
      
      // Atualiza a lista de conversas
      fetchConversations();
      
      toast({
        title: "Sucesso!",
        description: result.message || "Conversas foram salvas com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao processar arquivo",
        description: error.message,
        variant: "destructive"
      });
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
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 flex items-center justify-center p-2">
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