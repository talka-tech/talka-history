// api/upload-chat.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const config = {
  runtime: 'edge',
};

interface Message {
  timestamp: string;
  sender: string;
  content: string;
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

// TEMPORARIAMENTE DESABILITADO - PRECISA CONVERSÃO PARA SUPABASE
export default async function handler(request: Request) {
  return new Response(JSON.stringify({ error: 'API temporariamente desabilitada - em migração para Supabase' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  });
}