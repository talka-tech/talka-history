# Talka History 📊

**Plataforma Inteligente de Análise de Conversas WhatsApp**

![Talka History](public/img/logo.png)

## 🎯 Visão Geral

O **Talka History** é uma solução empresarial avançada para análise e gerenciamento de históricos de conversas do WhatsApp. Desenvolvido para empresas que precisam processar, analisar e extrair insights de grandes volumes de dados de comunicação.

### 🚀 Principais Funcionalidades

- **📈 Processamento de Dados em Escala**: Suporte para mais de 11.000 conversas com sistema híbrido de carregamento
- **🔍 Busca Inteligente**: Sistema de busca dupla com indexação por título e normalização numérica
- **⚡ Performance Otimizada**: Carregamento inicial de 100 conversas com paginação visual + busca individual em todo o dataset
- **🗜️ Compressão Automática**: Sistema de compressão com Pako para uploads até 80% menores
- **📊 Interface Responsiva**: Dashboard moderno com tema dark e gradientes corporativos
- **🔐 Autenticação Segura**: Sistema de login com controle de usuários por empresa
- **📅 Filtros Avançados**: Filtros por data com presets rápidos (hoje, 7 dias, 30 dias, 1 ano)
- **🗑️ Gerenciamento Completo**: Exclusão de conversas individuais e mensagens específicas

## 🏗️ Arquitetura Técnica

### Frontend
- **React 18** com TypeScript
- **Vite** para build otimizado
- **Tailwind CSS** para estilização
- **shadcn/ui** para componentes
- **Zustand** para gerenciamento de estado
- **React Hook Form** para formulários

### Backend & Database
- **Supabase** como Backend-as-a-Service
- **PostgreSQL** para banco de dados relacional
- **Edge Functions** para APIs serverless
- **Row Level Security (RLS)** para segurança

### Processamento de Dados
- **Pako** para compressão de arquivos
- **CSV Parser** customizado para WhatsApp exports
- **Sistema Híbrido** de busca e carregamento
- **Normalização automática** de números de telefone

## 📋 Funcionalidades Detalhadas

### 1. Sistema Híbrido de Carregamento
```
📊 Carregamento Padrão: 100 conversas mais recentes (10 páginas de 10)
🔍 Busca Individual: Acesso a todas as 11k+ conversas via API dedicada
⚡ Performance: Carregamento rápido + busca completa quando necessário
```

### 2. Upload Inteligente de CSV
- **Validação automática** de estrutura CSV
- **Compressão em tempo real** com Pako
- **Processamento frontend** para máxima velocidade
- **Progress tracking** visual durante upload
- **Suporte a arquivos grandes** (testado com datasets de 11k+ conversas)

### 3. Busca Avançada
- **Busca por título**: Matching direto em nomes/títulos
- **Busca numérica**: Normalização automática de números (81) 8195-3019 → 818195
- **Debounce inteligente**: 500ms para otimizar performance
- **Resultados em tempo real**: Feedback visual instantâneo

### 4. Interface Moderna
- **Design System** consistente com gradientes corporativos
- **Tema Dark** otimizado para longas sessões de trabalho
- **Componentes modulares** com shadcn/ui
- **Responsive design** para desktop e mobile
- **Loading states** e feedback visual completo

## 🛠️ Instalação e Configuração

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn
- Conta Supabase configurada

### Configuração Local

```bash
# 1. Clone o repositório
git clone https://github.com/talka-tech/talka-produtos.git
cd talka-produtos/Talka-Historico

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas credenciais Supabase

# 4. Execute o servidor de desenvolvimento
npm run dev
```

### Variáveis de Ambiente Necessárias
```env
NEXT_PUBLIC_SUPABASE_URL=sua_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
```

## 📊 Estrutura do Banco de Dados

### Tabelas Principais

**`users`**
```sql
- id (bigint, primary key)
- username (text, unique)
- password_hash (text)
- created_at (timestamp)
- status (text, default: 'active')
```

**`conversations`**
```sql
- id (text, primary key)
- title (text)
- user_id (bigint, foreign key)
- created_at (timestamp)
- updated_at (timestamp)
```

**`messages`**
```sql
- id (text, primary key)
- conversation_id (text, foreign key)
- timestamp (timestamp)
- sender (text)
- content (text)
- fromMe (boolean)
- created_at (timestamp)
```

## 🔧 APIs Disponíveis

### Autenticação
- `POST /api/login` - Login de usuário
- `POST /api/create-user` - Criação de usuário
- `PUT /api/update-user-password` - Atualização de senha

### Conversas
- `GET /api/conversations` - Lista primeiras 100 conversas
- `GET /api/search-conversations` - Busca em todas as conversas
- `GET /api/total-conversations` - Count total de conversas
- `DELETE /api/delete-conversation` - Remove conversa específica
- `DELETE /api/delete-message` - Remove mensagem específica

### Upload e Processamento
- `POST /api/upload-csv-compressed` - Upload com compressão
- `POST /api/clear-data-supabase` - Limpeza de dados

### Administração
- `GET /api/admin-metrics` - Métricas administrativas
- `POST /api/create-admin` - Criação de admin
- `GET /api/users` - Listagem de usuários

## 🚀 Deploy em Produção

### Vercel (Recomendado)
```bash
# 1. Conecte o repositório no Vercel
# 2. Configure as variáveis de ambiente
# 3. Deploy automático via Git

# Ou via CLI:
npm i -g vercel
vercel --prod
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 📈 Métricas e Performance

### Benchmarks Atuais
- **Carregamento inicial**: ~500ms para 100 conversas
- **Busca individual**: ~1-2s para busca em 11k+ conversas
- **Upload CSV**: ~30s para 11k conversas (com compressão)
- **Compressão**: Até 80% de redução no tamanho

### Otimizações Implementadas
- **Lazy loading** de mensagens
- **Debounce** em buscas
- **Compressão Pako** para uploads
- **Edge Functions** para APIs
- **Indexação** otimizada no Supabase

## 🔐 Segurança

- **Row Level Security (RLS)** no Supabase
- **Hash bcrypt** para senhas
- **Validação** de inputs em todas as APIs
- **CORS** configurado adequadamente
- **Rate limiting** em endpoints sensíveis

## 🤝 Contribuição

### Padrões de Código
- **TypeScript** strict mode
- **ESLint** + **Prettier** configurados
- **Conventional commits** para mensagens
- **Component-first** architecture

### Processo de Desenvolvimento
1. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
2. Commit suas mudanças: `git commit -m 'feat: adiciona nova funcionalidade'`
3. Push para branch: `git push origin feature/nova-funcionalidade`
4. Abra um Pull Request

## 📞 Suporte

- **Email**: suporte@talka.tech
- **Documentação**: [docs.talka.tech](https://docs.talka.tech)
- **Issues**: [GitHub Issues](https://github.com/talka-tech/talka-produtos/issues)

## 📄 Licença

Copyright © 2025 Talka Tech. Todos os direitos reservados.

---

**Desenvolvido com ❤️ pela equipe Talka Tech**
