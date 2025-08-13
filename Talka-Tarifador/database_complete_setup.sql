-- ESTRUTURA COMPLETA DAS TABELAS - EXECUTE NO SUPABASE SQL EDITOR
-- Remover tabelas existentes e recriar do zero

-- 1. Remover tabelas existentes (cuidado! isso apaga todos os dados)
DROP TABLE IF EXISTS usage_history CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 2. Criar tabela USERS (Administradores)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Criar tabela CLIENTS (Clientes criados pelos admins)
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL, -- Nome da empresa
    login VARCHAR(100) UNIQUE NOT NULL, -- Login único do cliente
    password VARCHAR(255) NOT NULL, -- Senha em texto claro (para o admin ver)
    type VARCHAR(50) NOT NULL CHECK (type IN ('projeto', 'individual')),
    credits_total INTEGER DEFAULT 0,
    credits_used INTEGER DEFAULT 0,
    credits_remaining INTEGER GENERATED ALWAYS AS (credits_total - credits_used) STORED,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id), -- Qual admin criou este cliente
    last_usage TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Criar tabela USAGE_HISTORY (Histórico de uso dos clientes)
CREATE TABLE usage_history (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    credits_consumed INTEGER NOT NULL,
    description TEXT,
    usage_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Desabilitar RLS (Row Level Security) em todas as tabelas
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE usage_history DISABLE ROW LEVEL SECURITY;

-- 6. Criar índices para performance
CREATE INDEX idx_clients_login ON clients(login);
CREATE INDEX idx_clients_is_active ON clients(is_active);
CREATE INDEX idx_usage_history_client_id ON usage_history(client_id);
CREATE INDEX idx_usage_history_date ON usage_history(usage_date);

-- 7. Criar triggers para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Inserir um admin padrão
INSERT INTO users (email, name, role, password_hash) VALUES 
('admin', 'Administrador Talka', 'admin', 'Talka2025!');

-- 9. Inserir alguns clientes de exemplo (opcional)
INSERT INTO clients (name, login, password, type, credits_total, created_by) VALUES 
('Empresa Teste', 'teste123', 'senha123', 'projeto', 5000, 1),
('Cliente Individual', 'individual1', 'pass456', 'individual', 2000, 1);

-- 10. Verificar as tabelas criadas
SELECT 'USERS TABLE:' as info;
SELECT * FROM users;

SELECT 'CLIENTS TABLE:' as info;
SELECT * FROM clients;

SELECT 'USAGE_HISTORY TABLE:' as info;
SELECT * FROM usage_history;
