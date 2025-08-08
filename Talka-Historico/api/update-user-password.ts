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
    const { userId, newPassword } = await request.json();

    if (!userId || !newPassword) {
      return new Response(JSON.stringify({ error: 'User ID and new password are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Atualizar a senha do usuário
    const { error } = await supabase
      .from('users')
      .update({ password: newPassword })
      .eq('id', userId);

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ message: 'Password updated successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ 
      error: 'Failed to update password', 
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
