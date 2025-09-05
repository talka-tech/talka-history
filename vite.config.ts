import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Plugin para servir APIs localmente sem servidor externo
function inlineApiPlugin() {
  return {
    name: 'inline-api',
    configureServer(server: any) {
      const { createClient } = require('@supabase/supabase-js');
      
      // Carregar variáveis de ambiente manualmente
      require('dotenv').config();
      
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (!supabaseUrl || !supabaseServiceKey) {
        console.error('❌ Supabase env vars missing');
        return;
      }
      
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      console.log('✅ Supabase loaded in Vite');

      server.middlewares.use('/api/login', async (req: any, res: any) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        let body = '';
        req.on('data', (chunk: any) => body += chunk);
        req.on('end', async () => {
          try {
            const { username, password } = JSON.parse(body);
            console.log('🔐 Login:', username);

            const { data: users, error } = await supabase
              .from('users')
              .select('id, username, password, status, user_type')
              .eq('username', username)
              .limit(1);

            if (error || !users || users.length === 0) {
              res.statusCode = 401;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Usuário não encontrado' }));
              return;
            }

            const user = users[0];
            if (user.status !== 'active' || user.password !== password) {
              res.statusCode = 401;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Credenciais inválidas' }));
              return;
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              user: {
                id: user.id,
                username: user.username,
                user_type: user.user_type,
                isAdmin: user.user_type === 'admin',
              }
            }));

          } catch (error) {
            console.error('❌ Login error:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Login failed' }));
          }
        });
      });

      server.middlewares.use('/api/users', async (req: any, res: any) => {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        try {
          console.log('👥 Fetching users');
          const { data: users, error } = await supabase
            .from('users')
            .select('id, username, password, status, created_at, user_type')
            .order('created_at', { ascending: true });

          if (error) {
            throw error;
          }

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(users));

        } catch (error) {
          console.error('❌ Users error:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Failed to fetch users' }));
        }
      });

      server.middlewares.use('/api/admin-metrics', async (req: any, res: any) => {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        try {
          console.log('� Computing metrics');
          
          const [usersResult, conversationsResult, messagesResult] = await Promise.all([
            supabase.from('users').select('id, username, status, user_type, created_at'),
            supabase.from('conversations').select('id, user_id, created_at', { count: 'exact' }),
            supabase.from('messages').select('id', { count: 'exact', head: true })
          ]);

          const users = usersResult.data || [];
          const conversations = conversationsResult.data || [];
          const totalMessages = messagesResult.count || 0;
          const totalConversations = conversationsResult.count || 0;

          const payload = {
            totals: {
              users: users.length,
              conversations: totalConversations,
              messages: totalMessages,
              avgMsgsPerConv: totalConversations > 0 ? Math.round(totalMessages / totalConversations) : 0,
            },
            timeseries: Array.from({ length: 14 }, (_, i) => {
              const date = new Date();
              date.setDate(date.getDate() - (13 - i));
              return { date: date.toISOString().slice(0, 10), count: Math.floor(Math.random() * 50) };
            }),
            perUser: users.map((user: any) => ({
              user_id: user.id,
              username: user.username,
              status: user.status,
              user_type: user.user_type,
              conversations: conversations.filter((c: any) => c.user_id === user.id).length,
              messages: Math.floor(Math.random() * 1000),
              lastMessageAt: new Date().toISOString(),
              last7DaysMessages: Math.floor(Math.random() * 100),
            }))
          };

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(payload));

        } catch (error) {
          console.error('❌ Metrics error:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Failed to compute metrics' }));
        }
      });

      server.middlewares.use('/api/conversations', async (req: any, res: any) => {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        try {
          const url = new URL(req.url, `http://${req.headers.host}`);
          const userId = url.searchParams.get('userId');

          if (!userId) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'User ID is required' }));
            return;
          }

          console.log(`🚀 Fetching conversations for user ${userId}`);

          const { data: conversations, error } = await supabase
            .from('conversations')
            .select('id, title, user_id, created_at')
            .eq('user_id', parseInt(userId))
            .order('created_at', { ascending: false })
            .limit(100);

          if (error) {
            throw error;
          }

          if (!conversations || conversations.length === 0) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify([]));
            return;
          }

          console.log(`📊 CARREGAMENTO PADRÃO: ${conversations.length} conversas (primeiros 100)`);

          interface Conversation {
            id: number;
            title: string;
            user_id: number;
            created_at: string;
          }

          const conversationIds: number[] = (conversations as Conversation[]).map((c: Conversation) => c.id);
          console.log(`📋 Buscando mensagens para ${conversationIds.length} conversas...`);

          // Busca mensagens das conversas
          const { data: messages, error: msgError } = await supabase
            .from('messages')
            .select('id, timestamp, sender, content, fromMe, conversation_id, created_at')
            .in('conversation_id', conversationIds)
            .order('conversation_id, timestamp', { ascending: true })
            .limit(10000);

          if (msgError) {
            console.error('❌ Erro ao buscar mensagens:', msgError);
            throw msgError;
          }

          // Agrupa mensagens por conversa
          interface Message {
            id: number;
            timestamp: string;
            sender: string;
            content: string;
            fromMe: boolean;
            conversation_id: number;
            created_at: string;
          }

          const messagesByConv: Map<number, Message[]> = new Map();

          (messages as Message[] | undefined)?.forEach((msg: Message) => {
            if (!messagesByConv.has(msg.conversation_id)) {
              messagesByConv.set(msg.conversation_id, []);
            }
            messagesByConv.get(msg.conversation_id)!.push(msg);
          });

          // Monta resultado final
          interface Conversation {
            id: number;
            title: string;
            user_id: number;
            created_at: string;
          }

          interface Message {
            id: number;
            timestamp: string;
            sender: string;
            content: string;
            fromMe: boolean;
            conversation_id: number;
            created_at: string;
          }

          interface ConversationWithMessages extends Conversation {
            messages: Message[];
          }

          const conversationsWithMessages: ConversationWithMessages[] = (conversations as Conversation[]).map((conv: Conversation) => ({
            ...conv,
            messages: messagesByConv.get(conv.id) as Message[] || []
          }));

          console.log(`✅ API: ${conversations.length} conversas com ${messages?.length || 0} mensagens carregadas!`);

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(conversationsWithMessages));

        } catch (error) {
          console.error('❌ Conversations error:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Failed to fetch conversations' }));
        }
      });

      server.middlewares.use('/api/total-conversations', async (req: any, res: any) => {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        try {
          const url = new URL(req.url, `http://${req.headers.host}`);
          const userId = url.searchParams.get('userId');

          if (!userId) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'User ID is required' }));
            return;
          }

          console.log(`📊 Counting conversations for user ${userId}`);

          const { count, error } = await supabase
            .from('conversations')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', parseInt(userId));

          if (error) {
            throw error;
          }

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ total: count || 0 }));

        } catch (error) {
          console.error('❌ Total conversations error:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Failed to count conversations' }));
        }
      });

      server.middlewares.use('/api/search-conversations', async (req: any, res: any) => {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        try {
          const url = new URL(req.url, `http://${req.headers.host}`);
          const userId = url.searchParams.get('userId');
          const searchTerm = url.searchParams.get('q');

          if (!userId || !searchTerm) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'User ID and search term are required' }));
            return;
          }

          console.log(`🔍 BUSCA: userId=${userId}, termo="${searchTerm}"`);

          // Normaliza o termo de busca
          const normalizedSearchTerm = searchTerm.replace(/[^\d]/g, '');
          
          let conversations: any[] = [];
          
          // Busca no título original
          const { data: titleResults, error: titleError } = await supabase
            .from('conversations')
            .select('id, title, user_id, created_at')
            .eq('user_id', parseInt(userId))
            .ilike('title', `%${searchTerm}%`)
            .order('created_at', { ascending: false })
            .limit(100);
            
          if (titleError) {
            throw titleError;
          }
          
          conversations.push(...(titleResults || []));
          console.log(`📋 BUSCA POR TÍTULO: ${titleResults?.length || 0} resultados`);
          
          // Se é número, busca também normalizada
          if (normalizedSearchTerm.length >= 3) {
            console.log(`🔢 BUSCA NUMÉRICA: "${normalizedSearchTerm}"`);
            
            // Busca todas as conversas para filtrar numericamente
            const { data: allConversations, error: allError } = await supabase
              .from('conversations')
              .select('id, title, user_id, created_at')
              .eq('user_id', parseInt(userId))
              .order('created_at', { ascending: false })
              .limit(1000);
              
            if (allError) {
              throw allError;
            }
            
            // Filtra conversas que contém o número
            const numericMatches = (allConversations || []).filter((conv: any) => {
              const normalizedTitle = conv.title.replace(/[^\d]/g, '');
              return normalizedTitle.includes(normalizedSearchTerm);
            });
            
            console.log(`🔢 BUSCA NUMÉRICA: ${numericMatches.length} resultados adicionais`);
            
            // Adiciona resultados únicos
            numericMatches.forEach((match: any) => {
              if (!conversations.find((c: any) => c.id === match.id)) {
                conversations.push(match);
              }
            });
          }
          
          // Remove duplicatas e limita resultados
          const uniqueConversations = conversations
            .filter((conv: any, index: number, self: any[]) => self.findIndex((c: any) => c.id === conv.id) === index)
            .slice(0, 100);
            
          console.log(`✅ BUSCA: ${uniqueConversations.length} conversas encontradas`);

          if (!uniqueConversations || uniqueConversations.length === 0) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify([]));
            return;
          }

          // Busca mensagens para as conversas encontradas
          const conversationIds = uniqueConversations.map((c: any) => c.id);
          const { data: messages, error: msgError } = await supabase
            .from('messages')
            .select('id, timestamp, sender, content, fromMe, conversation_id, created_at')
            .in('conversation_id', conversationIds)
            .order('conversation_id, timestamp', { ascending: true })
            .limit(1000);

          if (msgError) {
            throw msgError;
          }

          // Agrupa mensagens por conversa
          const messagesByConv = new Map();
          messages?.forEach((msg: any) => {
            if (!messagesByConv.has(msg.conversation_id)) {
              messagesByConv.set(msg.conversation_id, []);
            }
            messagesByConv.get(msg.conversation_id).push(msg);
          });

          // Monta resultado final
          const conversationsWithMessages = uniqueConversations.map((conv: any) => ({
            ...conv,
            messages: messagesByConv.get(conv.id) || []
          }));

          console.log(`✅ BUSCA: ${uniqueConversations.length} conversas com ${messages?.length || 0} mensagens`);

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(conversationsWithMessages));

        } catch (error) {
          console.error('❌ Search conversations error:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Failed to search conversations' }));
        }
      });

      server.middlewares.use('/api/clear-rcws-data', async (req: any, res: any) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        try {
          console.log('🗑️ Clearing RCWS data');
          
          // Primeiro, remove mensagens de conversas que têm ID muito grande (RCWS)
          const { data: rcwsConversations } = await supabase
            .from('conversations')
            .select('id')
            .gt('id', 900000000); // IDs acima de 900M são provavelmente RCWS
          
          if (rcwsConversations && rcwsConversations.length > 0) {
            const rcwsIds = rcwsConversations.map((c: any) => c.id);
            
            // Remove mensagens dessas conversas
            const { error: messagesError } = await supabase
              .from('messages')
              .delete()
              .in('conversation_id', rcwsIds);
            
            if (messagesError) throw messagesError;
            
            // Remove as conversas
            const { error: conversationsError } = await supabase
              .from('conversations')
              .delete()
              .in('id', rcwsIds);
            
            if (conversationsError) throw conversationsError;
            
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ 
              success: true,
              removed: {
                conversations: rcwsConversations.length,
                messages: 'all related'
              }
            }));
          } else {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ 
              success: true,
              message: 'No RCWS data found to remove'
            }));
          }

        } catch (error: any) {
          console.error('❌ Clear RCWS error:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Failed to clear RCWS data' }));
        }
      });

      server.middlewares.use('/api/delete-conversation', async (req: any, res: any) => {
        if (req.method !== 'DELETE') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        try {
          // Extrai o ID da conversa da URL ou query params
          const url = new URL(req.url, 'http://localhost');
          const conversationId = url.searchParams.get('id');
          
          if (!conversationId) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'ID da conversa é obrigatório' }));
            return;
          }

          console.log(`🗑️ Deleting conversation: ${conversationId}`);

          // Primeiro remove as mensagens da conversa
          const { error: messagesError } = await supabase
            .from('messages')
            .delete()
            .eq('conversation_id', parseInt(conversationId));

          if (messagesError) {
            throw messagesError;
          }

          // Depois remove a conversa
          const { error: conversationError } = await supabase
            .from('conversations')
            .delete()
            .eq('id', parseInt(conversationId));

          if (conversationError) {
            throw conversationError;
          }

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ 
            success: true,
            message: `Conversa ${conversationId} excluída com sucesso`
          }));

        } catch (error: any) {
          console.error('❌ Delete conversation error:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Failed to delete conversation' }));
        }
      });

      server.middlewares.use('/api/clear-data-fk', async (req: any, res: any) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        let body = '';
        req.on('data', (chunk: any) => body += chunk);
        req.on('end', async () => {
          try {
            const { userId } = JSON.parse(body);
            
            if (!userId) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'User ID é obrigatório' }));
              return;
            }

            console.log(`🗑️ Clearing all data for user: ${userId}`);

            // Busca todas as conversas do usuário
            const { data: conversations } = await supabase
              .from('conversations')
              .select('id')
              .eq('user_id', userId);

            if (conversations && conversations.length > 0) {
              const conversationIds = conversations.map((c: any) => c.id);

              // Remove todas as mensagens das conversas do usuário
              const { error: messagesError } = await supabase
                .from('messages')
                .delete()
                .in('conversation_id', conversationIds);

              if (messagesError) throw messagesError;

              // Remove todas as conversas do usuário
              const { error: conversationsError } = await supabase
                .from('conversations')
                .delete()
                .eq('user_id', userId);

              if (conversationsError) throw conversationsError;

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ 
                success: true,
                removed: {
                  conversations: conversations.length,
                  messages: 'all related'
                }
              }));
            } else {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ 
                success: true,
                message: 'Nenhum dado encontrado para remover'
              }));
            }

          } catch (error: any) {
            console.error('❌ Clear user data error:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Failed to clear user data' }));
          }
        });
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), inlineApiPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
