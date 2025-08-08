export default async function handler(request: Request): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    console.log('🧪 TEST API: Starting...');
    
    const body = await request.json();
    console.log('🧪 TEST API: Body received:', Object.keys(body));
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Test API working!',
      received: Object.keys(body)
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('🧪 TEST API ERROR:', error);
    
    return new Response(JSON.stringify({
      error: 'Test API failed',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
