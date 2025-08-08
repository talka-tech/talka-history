import { Database } from 'bun:sqlite';

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Método não permitido' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    try {
      const { userId, status } = await request.json();

      if (!userId || !status) {
        return new Response(JSON.stringify({ error: 'userId e status são obrigatórios' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (!['active', 'inactive'].includes(status)) {
        return new Response(JSON.stringify({ error: 'Status deve ser "active" ou "inactive"' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Conectar ao banco de dados
      const db = new Database('talka.db');

      // Verificar se o usuário existe
      const existingUser = db.query('SELECT * FROM users WHERE id = ?').get(userId);
      if (!existingUser) {
        db.close();
        return new Response(JSON.stringify({ error: 'Usuário não encontrado' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Atualizar o status do usuário
      const updateQuery = db.prepare('UPDATE users SET status = ? WHERE id = ?');
      const result = updateQuery.run(status, userId);

      db.close();

      if (result.changes === 0) {
        return new Response(JSON.stringify({ error: 'Falha ao atualizar status do usuário' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ 
        message: `Status do usuário atualizado para ${status}`,
        userId: userId,
        newStatus: status
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Erro ao atualizar status do usuário:', error);
      return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};
