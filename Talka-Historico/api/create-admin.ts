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
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Verificar se já existe um admin
    const { data: existingAdmin, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('username', 'admin')
      .limit(1);

    if (checkError) {
      throw checkError;
    }

    if (existingAdmin && existingAdmin.length > 0) {
      return new Response(JSON.stringify({ message: 'Admin já existe' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Criar usuário admin padrão
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          username: 'admin',
          password: 'Talka2025!',
          status: 'active',
          user_type: 'admin'
        }
      ])
      .select();

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ 
      message: 'Admin criado com sucesso',
      user: data[0]
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Erro ao criar admin:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to create admin', 
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
