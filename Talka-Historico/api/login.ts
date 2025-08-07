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

    // --- MUDANÇA PARA TESTE ---
    // Vamos procurar o utilizador, mas ignorar a senha por agora
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, status')
      .eq('username', username)
      .limit(1);

    if (error) {
      throw error;
    }

    if (!users || users.length === 0) {
      // Se o utilizador não for encontrado, as credenciais são inválidas
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      });
    }

    const user = users[0];

    // Se o utilizador existir, vamos simplesmente permitir o login (APENAS PARA TESTE)
    return new Response(JSON.stringify({
      id: user.id,
      username: user.username,
      isAdmin: user.username === 'admin',
    }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: 'Login failed', details: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}