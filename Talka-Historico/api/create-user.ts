// api/create-user.ts
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
    const { username, password, userType } = await request.json();
    if (!username || !password) {
      return new Response(JSON.stringify({ error: 'Username and password are required' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    // Usar senha simples (como no resto do sistema)
    const { data, error } = await supabase
      .from('users')
      .insert([
        { 
          username, 
          password: password, // Senha simples, sem hash
          user_type: userType || 'client',
          status: 'active'
        }
      ])
      .select();

    if (error) {
      if (error.code === '23505') {
        return new Response(JSON.stringify({ error: 'Nome de usuário já existe' }), {
          status: 409, headers: { 'Content-Type': 'application/json' },
        });
      }
      throw error;
    }

    return new Response(JSON.stringify({ message: 'Usuário criado com sucesso' }), {
      status: 201, headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    if (error.code === '23505') {
      return new Response(JSON.stringify({ error: 'Nome de usuário já existe' }), {
        status: 409, headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: 'Falha ao criar usuário', details: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}