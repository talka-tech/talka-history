// api/conversations.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
    if (request.method !== 'GET') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
            status: 405, headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const url = new URL(request.url);
        const userId = url.searchParams.get('userId');

        if (!userId) {
            return new Response(JSON.stringify({ error: 'User ID is required' }), {
                status: 400, headers: { 'Content-Type': 'application/json' }
            });
        }

        const { data: conversations, error: convError } = await supabase
            .from('conversations')
            .select('*')
            .eq('user_id', parseInt(userId))
            .order('created_at', { ascending: false });

        if (convError) {
            throw convError;
        }

        for (const convo of conversations || []) {
            const { data: messages, error: msgError } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', convo.id)
                .order('timestamp', { ascending: true });

            if (msgError) {
                throw msgError;
            }

            convo.messages = messages;
        }

        return new Response(JSON.stringify(conversations), {
            status: 200, headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: "Failed to fetch conversations", details: error.message }), {
            status: 500, headers: { 'Content-Type': 'application/json' }
        });
    }
}