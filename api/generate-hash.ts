import * as jose from 'jose';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  try {
    const url = new URL(request.url);
    const password = url.searchParams.get('password');

    if (!password) {
      return new Response('Por favor, adicione ?password=SUA_SENHA na URL.', { status: 400 });
    }

    // Chave secreta - deve ser a mesma usada em create-user.ts e login.ts
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || 'uma-chave-secreta-forte-e-longa'
    );

    const jwt = await new jose.SignJWT({ password })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .sign(secret);

    return new Response(jwt, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });

  } catch (error: any) {
    return new Response(`Erro ao gerar hash: ${error.message}`, { status: 500 });
  }
}