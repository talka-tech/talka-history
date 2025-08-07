// api/upload-chat.ts
import { sql } from '@vercel/postgres';

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

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { conversations, userId } = await request.json();

    if (!conversations || !Array.isArray(conversations) || !userId) {
      return new Response(JSON.stringify({ error: 'Invalid data format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const client = await sql.connect();
    try {
      await client.sql`BEGIN`;

      for (const convo of conversations) {
        await client.sql`
          INSERT INTO conversations (id, title, participants, message_count, last_message, last_timestamp, owner_user_id)
          VALUES (${convo.id}, ${convo.title}, ${convo.participants}, ${convo.messageCount}, ${convo.lastMessage}, ${convo.lastTimestamp}, ${userId})
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            participants = EXCLUDED.participants,
            message_count = EXCLUDED.message_count,
            last_message = EXCLUDED.last_message,
            last_timestamp = EXCLUDED.last_timestamp;
        `;

        await client.sql`DELETE FROM messages WHERE conversation_id = ${convo.id};`;

        for (const msg of convo.messages) {
          await client.sql`
            INSERT INTO messages (conversation_id, timestamp, sender, content, from_me)
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

    return new Response(JSON.stringify({ message: 'Chat history uploaded successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: 'Failed to upload chat history', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}