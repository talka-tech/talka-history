// api/admin-metrics.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export const config = { runtime: 'edge' }

function toISODate(d: Date) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString()
}

export default async function handler(request: Request) {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } })
  }

  try {
    const now = new Date()
    const since14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    const since7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Users
    const { data: users, error: usersErr } = await supabase
      .from('users')
      .select('id, username, status, user_type, created_at')
      .order('created_at', { ascending: true })
    if (usersErr) throw usersErr

    // Conversations (all)
    const { data: conversations, count: totalConversations, error: convErr } = await supabase
      .from('conversations')
      .select('id, user_id, created_at', { count: 'exact' })
    if (convErr) throw convErr

    // Messages count (total)
    const { count: totalMessages, error: msgCountErr } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
    if (msgCountErr) throw msgCountErr

    // Messages last 14 days (timestamps only)
    const { data: recentMsgs, error: recentErr } = await supabase
      .from('messages')
      .select('id, timestamp, conversation_id')
      .gte('timestamp', since14.toISOString())
    if (recentErr) throw recentErr

    // Map convId -> userId
    const convUserMap = new Map<number, number>()
    for (const c of conversations || []) convUserMap.set(c.id, c.user_id)

    // Timeseries (overall)
    const perDay = new Map<string, number>()
    for (let i = 0; i < 14; i++) {
      const d = new Date(now.getTime() - (13 - i) * 24 * 60 * 60 * 1000)
      const key = d.toISOString().slice(0, 10)
      perDay.set(key, 0)
    }
    for (const m of recentMsgs || []) {
      const key = new Date(m.timestamp).toISOString().slice(0, 10)
      if (perDay.has(key)) perDay.set(key, (perDay.get(key) || 0) + 1)
    }
    const timeseries = Array.from(perDay.entries()).map(([date, count]) => ({ date, count }))

    // Per-user metrics
    const perUser: any[] = []
    for (const u of users || []) {
      const convsForUser = (conversations || []).filter(c => c.user_id === u.id)
      const convIds = convsForUser.map(c => c.id)

      let messages = 0
      let lastMessageAt: string | null = null
      let last7DaysMessages = 0

      if (convIds.length) {
        // Count total messages for this user's convs
        const { count: userMsgCount } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .in('conversation_id', convIds)

        messages = userMsgCount || 0

        // Last message timestamp
        const { data: lastMsgData } = await supabase
          .from('messages')
          .select('timestamp')
          .in('conversation_id', convIds)
          .order('timestamp', { ascending: false })
          .limit(1)
        lastMessageAt = lastMsgData?.[0]?.timestamp || null

        // Messages last 7 days for this user
        const { count: last7 } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .in('conversation_id', convIds)
          .gte('timestamp', since7.toISOString())
        last7DaysMessages = last7 || 0
      }

      perUser.push({
        user_id: u.id,
        username: u.username,
        status: u.status,
        user_type: u.user_type,
        conversations: convIds.length,
        messages,
        lastMessageAt,
        last7DaysMessages,
      })
    }

    // Avg messages per conversation
    const avgMsgsPerConv = totalConversations && totalConversations > 0 ? Math.round((totalMessages || 0) / totalConversations) : 0

    const payload = {
      totals: {
        users: users?.length || 0,
        conversations: totalConversations || 0,
        messages: totalMessages || 0,
        avgMsgsPerConv,
      },
      timeseries,
      perUser: perUser.sort((a, b) => b.messages - a.messages).slice(0, 20),
    }

    return new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Failed to compute metrics', details: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
