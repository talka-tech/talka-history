// api/create-user.ts
import { createClient } from '@supabase/supabase-js';
import * as jose from 'jose';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const config = {
  runtime: 'edge',
};

// Função para criar um hash da senha
async function hashPassword(password: string): Promise<string> {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'uma-chave-secreta-forte-e-longa');
    const jwt = await new jose.SignJWT({ password })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .sign(secret);
    return jwt;
}

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

    // Usando a nova função para criar o hash
    const hashedPassword = await hashPassword(password);

    const { data, error } = await supabase
      .from('users')
      .insert([
        { username, password: hashedPassword }
      ])
      .select();

    if (error) {
      if (error.code === '23505') {
        return new Response(JSON.stringify({ error: 'Username already exists' }), {
          status: 409, headers: { 'Content-Type': 'application/json' },
        });
      }
      throw error;
    }

    return new Response(JSON.stringify({ message: 'User created successfully' }), {
      status: 201, headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    if (error.code === '23505') {
      return new Response(JSON.stringify({ error: 'Username already exists' }), {
        status: 409, headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: 'Failed to create user', details: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}