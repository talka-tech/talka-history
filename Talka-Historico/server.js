// server.js
import express from 'express';
import cors from 'cors';
import { join } from 'path';

const app = express();
const PORT = 3001;

// Middleware CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-user-id'],
  maxAge: 86400
}));

// Middleware para parsing de body com limite aumentado
app.use(express.text({ limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.raw({ limit: '50mb', type: '*/*' }));

// Função para simular Request API do Web standards
function createWebRequest(req) {
  const url = `http://localhost:${PORT}${req.url}`;
  const headers = new Headers();
  
  // Copiar headers do Express para Headers
  Object.entries(req.headers).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach(v => headers.append(key, v));
    } else {
      headers.set(key, value);
    }
  });
  
  const init = {
    method: req.method,
    headers: headers
  };
  
  // Adicionar body se necessário
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
    init.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  }
  
  return new Request(url, init);
}

// Route para APIs específicas
app.all('/api/upload-csv', async (req, res) => {
  try {
    // Simular o handler do upload-csv
    const webRequest = createWebRequest(req);
    
    // Importar a lógica do upload-csv diretamente
    const { default: uploadCsvHandler } = await import('./api/upload-csv.ts');
    const response = await uploadCsvHandler(webRequest);
    
    const responseText = await response.text();
    
    // Copiar headers da response
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    
    res.status(response.status).send(responseText);
    
  } catch (error) {
    console.error('Error in upload-csv:', error);
    res.status(500).json({ 
      error: 'Upload failed',
      details: error.message 
    });
  }
});

// Route genérica para outras APIs
app.all('/api/:apiName', async (req, res) => {
  const { apiName } = req.params;
  
  try {
    const webRequest = createWebRequest(req);
    const { default: handler } = await import(`./api/${apiName}.ts`);
    
    const response = await handler(webRequest);
    const responseText = await response.text();
    
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    
    res.status(response.status).send(responseText);
    
  } catch (error) {
    console.error(`Error in ${apiName}:`, error);
    res.status(500).json({ 
      error: 'API handler failed',
      details: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 API Server running at http://localhost:${PORT}`);
  console.log(`📁 Upload endpoint: http://localhost:${PORT}/api/upload-csv`);
});
