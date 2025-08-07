import { put } from '@vercel/blob';
import { sql } from '@vercel/postgres';

// Interface para os dados da conversa
interface Conversation {
  id: string;
  title: string;
  participants: string[];
  messageCount: number;
  lastMessage: string;
  lastTimestamp: string;
  messages: any[]; // Simplificado para o processamento
}

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!request.body) {
    return new Response(JSON.stringify({ error: 'No file body found in the request' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return new Response(JSON.stringify({ error: 'User ID is required' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  const blob = await put('chats.csv', request.body, {
    access: 'public',
  });

  try {
    const csvText = await (await fetch(blob.url)).text();
    const conversations = parseCSVToConversations(csvText);

    const client = await sql.connect();
    try {
        await client.sql`BEGIN`;
        for (const convo of conversations) {
            await client.sql`
              INSERT INTO conversations (id, title, participants, message_count, last_message, last_timestamp, owner_user_id)
              VALUES (${convo.id}, ${convo.title}, ${convo.participants as any}, ${convo.messageCount}, ${convo.lastMessage}, ${convo.lastTimestamp}, ${userId})
              ON CONFLICT (id) DO UPDATE SET
                title = EXCLUDED.title,
                participants = ${convo.participants as any},
                message_count = EXCLUDED.message_count,
                last_message = EXCLUDED.last_message,
                last_timestamp = EXCLUDED.last_timestamp;
            `;
            await client.sql`DELETE FROM messages WHERE conversation_id = ${convo.id};`;
            for (const msg of convo.messages) {
                await client.sql`
                  INSERT INTO messages (conversation_id, "timestamp", sender, content, from_me)
                  VALUES (${convo.id}, ${msg.timestamp}, ${msg.sender}, ${msg.content}, ${msg.fromMe});
                `;
            }
        }
        await client.sql`COMMIT`;
    } catch (e) {
        await client.sql`ROLLBACK`;
        throw e;
    } finally {
        client.release();
    }
    
    return new Response(JSON.stringify({ message: `${conversations.length} conversas salvas.` }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to process file and save to database.' }), {
        status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}


// --- Funções de Parsing (não precisam de alteração) ---
function parseCSVToConversations(csvText: string): Conversation[] {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];
    
    const headers = lines[0].split(',').map(h => h.trim());
    const messages: any[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        
        const values = parseCSVLine(line);
        
        if (values.length >= headers.length) {
            const chat_id = values[headers.indexOf('chat_id')]?.trim();
            const mobile_number = values[headers.indexOf('mobile_number')]?.trim();
            const fromMe = values[headers.indexOf('fromMe')]?.trim();
            const text = values[headers.indexOf('text')]?.trim();
            const message_created = values[headers.indexOf('message_created')]?.trim();
            const type = values[headers.indexOf('type')]?.trim();

            if (type !== 'text' || !text) continue;

            const sender = fromMe === '1' ? 'Você' : (mobile_number || 'Desconhecido');

            messages.push({
                timestamp: message_created || new Date().toISOString(),
                sender: sender,
                content: text,
                conversationId: chat_id || 'default',
                fromMe: fromMe === '1'
            });
        }
    }

    const conversationMap = new Map<string, any[]>();
    messages.forEach(msg => {
        const convId = msg.conversationId;
        if (!conversationMap.has(convId)) {
            conversationMap.set(convId, []);
        }
        conversationMap.get(convId)!.push(msg);
    });

    const conversations: Conversation[] = [];
    conversationMap.forEach((msgs, convId) => {
        const participants = [...new Set(msgs.map(m => m.sender))];
        const sortedMsgs = msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        const lastMsg = sortedMsgs[sortedMsgs.length - 1];
        
        const phoneNumbers = participants.filter(p => p !== 'Você');
        const title = phoneNumbers.length > 0 
            ? `${phoneNumbers[0]} ${phoneNumbers.length > 1 ? `+${phoneNumbers.length - 1} outros` : ''}`
            : `Conversa ${convId}`;
        
        conversations.push({
            id: convId,
            title: title,
            participants,
            messageCount: msgs.length,
            lastMessage: lastMsg.content.substring(0, 50) + (lastMsg.content.length > 50 ? '...' : ''),
            lastTimestamp: lastMsg.timestamp,
            messages: sortedMsgs
        });
    });

    return conversations.sort((a, b) => new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime());
}

function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}