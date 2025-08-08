import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return new Response(JSON.stringify({ error: 'Username and password are required' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    // Buscar o usuário com a senha
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, password, status, user_type')
      .eq('username', username)
      .limit(1);

    if (error) {
      throw error;
    }

    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ error: 'Usuário não encontrado' }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      });
    }

    const user = users[0];

    // Verificar se o usuário está ativo
    if (user.status !== 'active') {
      return new Response(JSON.stringify({ error: 'Conta de usuário inativa' }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verificar a senha (comparação simples)
    if (user.password !== password) {
      return new Response(JSON.stringify({ error: 'Senha incorreta' }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      });
    }

    // Login bem-sucedido
    return new Response(JSON.stringify({
      user: {
        id: user.id,
        username: user.username,
        user_type: user.user_type,
        isAdmin: user.user_type === 'admin' || user.username === 'admin',
      }
    }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: 'Login failed', details: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}