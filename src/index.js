/**
 * Cloudflare AI Chat Application
 * Main Worker entry point with AI integration, workflow coordination, and state management
 */

export default {
    async fetch(request, env, ctx) {
      const url = new URL(request.url);
      
      // CORS headers
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      };
  
      // Handle CORS preflight
      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }
  
      // Route handling
      if (url.pathname === '/api/chat' && request.method === 'POST') {
        return handleChat(request, env, corsHeaders);
      }
  
      if (url.pathname === '/api/history' && request.method === 'GET') {
        return handleGetHistory(request, env, corsHeaders);
      }
  
      if (url.pathname === '/api/history' && request.method === 'DELETE') {
        return handleDeleteHistory(request, env, corsHeaders);
      }
  
      // Serve frontend
      return handleFrontend(url, corsHeaders);
    }
  };
  
  /**
   * Handle chat message with AI integration and workflow coordination
   */
  async function handleChat(request, env, corsHeaders) {
    try {
      const { message, sessionId, conversationHistory } = await request.json();
  
      if (!message || !sessionId) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
  
      // Step 1: Build conversation context
      const messages = conversationHistory || [];
      messages.push({
        role: 'user',
        content: message
      });
  
      // Step 2: Call Workers AI with Llama 3.3
      const aiResponse = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
        messages: messages,
        stream: false,
        max_tokens: 1024,
        temperature: 0.7,
      });
  
      const assistantMessage = {
        role: 'assistant',
        content: aiResponse.response || aiResponse.result?.response || 'No response generated',
        timestamp: new Date().toISOString()
      };
  
      // Step 3: Save to database (persistent memory)
      await saveMessage(env, sessionId, 'user', message);
      await saveMessage(env, sessionId, 'assistant', assistantMessage.content);
  
      // Step 4: Return response
      return new Response(JSON.stringify({
        success: true,
        message: assistantMessage
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
  
    } catch (error) {
      console.error('Chat error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
  
  /**
   * Save message to D1 database
   */
  async function saveMessage(env, sessionId, role, content) {
    try {
      await env.DB.prepare(
        'INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)'
      ).bind(sessionId, role, content).run();
    } catch (error) {
      console.error('Database error:', error);
    }
  }
  
  /**
   * Get conversation history from database
   */
  async function handleGetHistory(request, env, corsHeaders) {
    try {
      const url = new URL(request.url);
      const sessionId = url.searchParams.get('sessionId');
  
      if (!sessionId) {
        return new Response(JSON.stringify({ error: 'Missing sessionId' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
  
      const { results } = await env.DB.prepare(
        'SELECT role, content, timestamp FROM messages WHERE session_id = ? ORDER BY timestamp ASC'
      ).bind(sessionId).all();
  
      return new Response(JSON.stringify({
        success: true,
        messages: results
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
  
    } catch (error) {
      console.error('History retrieval error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
  
  /**
   * Delete conversation history
   */
  async function handleDeleteHistory(request, env, corsHeaders) {
    try {
      const url = new URL(request.url);
      const sessionId = url.searchParams.get('sessionId');
  
      if (!sessionId) {
        return new Response(JSON.stringify({ error: 'Missing sessionId' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
  
      await env.DB.prepare(
        'DELETE FROM messages WHERE session_id = ?'
      ).bind(sessionId).run();
  
      return new Response(JSON.stringify({
        success: true,
        message: 'History deleted'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
  
    } catch (error) {
      console.error('Delete error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
  
  /**
   * Serve frontend HTML
   */
  function handleFrontend(url, corsHeaders) {
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return new Response(getFrontendHTML(), {
        headers: { ...corsHeaders, 'Content-Type': 'text/html' }
      });
    }
  
    return new Response('Not Found', { status: 404, headers: corsHeaders });
  }
  
  /**
   * Frontend HTML
   */
  function getFrontendHTML() {
    return `<!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Cloudflare AI Chat</title>
      <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="bg-gray-50">
      <div id="root"></div>
      <script src="/app.js"></script>
  </body>
  </html>`;
  }
  
  /**
   * Durable Object for session management (alternative to D1)
   */
  export class ChatSession {
    constructor(state, env) {
      this.state = state;
      this.env = env;
    }
  
    async fetch(request) {
      const url = new URL(request.url);
      
      if (url.pathname === '/messages') {
        if (request.method === 'GET') {
          const messages = await this.state.storage.get('messages') || [];
          return new Response(JSON.stringify(messages), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        if (request.method === 'POST') {
          const { message } = await request.json();
          const messages = await this.state.storage.get('messages') || [];
          messages.push(message);
          await this.state.storage.put('messages', messages);
          return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        if (request.method === 'DELETE') {
          await this.state.storage.delete('messages');
          return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
  
      return new Response('Not Found', { status: 404 });
    }
  }