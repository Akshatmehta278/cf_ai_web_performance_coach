/**
 * Server - Handles routing, request/response, and coordination
 */

import type { Env, ChatRequest, ChatResponse, HistoryResponse, Message } from './types';
import { createAgent } from './agent';

export class Server {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Main request handler
   */
  async handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const corsHeaders = this.getCorsHeaders();

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Route handling
    try {
      switch (true) {
        case url.pathname === '/api/chat' && request.method === 'POST':
          return await this.handleChat(request, corsHeaders);

        case url.pathname === '/api/history' && request.method === 'GET':
          return await this.handleGetHistory(request, corsHeaders);

        case url.pathname === '/api/history' && request.method === 'DELETE':
          return await this.handleDeleteHistory(request, corsHeaders);

        case url.pathname === '/api/summary' && request.method === 'POST':
          return await this.handleSummarize(request, corsHeaders);

        case url.pathname === '/health':
          return this.jsonResponse({ status: 'ok' }, corsHeaders);

        case url.pathname === '/' || url.pathname === '/index.html':
          return this.handleFrontend(corsHeaders);

        default:
          return this.jsonResponse(
            { error: 'Not Found' },
            corsHeaders,
            404
          );
      }
    } catch (error) {
      console.error('Server error:', error);
      return this.jsonResponse(
        { error: 'Internal Server Error' },
        corsHeaders,
        500
      );
    }
  }

  /**
   * Handle chat message with AI agent
   */
  private async handleChat(request: Request, corsHeaders: HeadersInit): Promise<Response> {
    try {
      const body = await request.json() as ChatRequest;
      const { message, sessionId, conversationHistory = [] } = body;

      // Validation
      if (!message || !sessionId) {
        return this.jsonResponse(
          { success: false, error: 'Missing required fields' },
          corsHeaders,
          400
        );
      }

      // Create AI agent
      const agent = createAgent(this.env);

      // Process message through agent
      const agentResponse = await agent.processMessage({
        sessionId,
        conversationHistory,
        userMessage: message,
      });

      // Save messages to database
      await this.saveMessage(sessionId, 'user', message);
      await this.saveMessage(sessionId, 'assistant', agentResponse.content);

      // Prepare response
      const assistantMessage: Message = {
        role: 'assistant',
        content: agentResponse.content,
        timestamp: new Date().toISOString(),
      };

      const response: ChatResponse = {
        success: true,
        message: assistantMessage,
      };

      return this.jsonResponse(response, corsHeaders);
    } catch (error) {
      console.error('Chat error:', error);
      return this.jsonResponse(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        corsHeaders,
        500
      );
    }
  }

  /**
   * Get conversation history
   */
  private async handleGetHistory(request: Request, corsHeaders: HeadersInit): Promise<Response> {
    try {
      const url = new URL(request.url);
      const sessionId = url.searchParams.get('sessionId');

      if (!sessionId) {
        return this.jsonResponse(
          { success: false, error: 'Missing sessionId' },
          corsHeaders,
          400
        );
      }

      const messages = await this.getMessages(sessionId);

      const response: HistoryResponse = {
        success: true,
        messages,
      };

      return this.jsonResponse(response, corsHeaders);
    } catch (error) {
      console.error('History retrieval error:', error);
      return this.jsonResponse(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        corsHeaders,
        500
      );
    }
  }

  /**
   * Delete conversation history
   */
  private async handleDeleteHistory(request: Request, corsHeaders: HeadersInit): Promise<Response> {
    try {
      const url = new URL(request.url);
      const sessionId = url.searchParams.get('sessionId');

      if (!sessionId) {
        return this.jsonResponse(
          { success: false, error: 'Missing sessionId' },
          corsHeaders,
          400
        );
      }

      await this.env.DB.prepare(
        'DELETE FROM messages WHERE session_id = ?'
      ).bind(sessionId).run();

      return this.jsonResponse(
        { success: true, message: 'History deleted' },
        corsHeaders
      );
    } catch (error) {
      console.error('Delete error:', error);
      return this.jsonResponse(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        corsHeaders,
        500
      );
    }
  }

  /**
   * Summarize conversation
   */
  private async handleSummarize(request: Request, corsHeaders: HeadersInit): Promise<Response> {
    try {
      const { sessionId } = await request.json() as { sessionId: string };

      if (!sessionId) {
        return this.jsonResponse(
          { success: false, error: 'Missing sessionId' },
          corsHeaders,
          400
        );
      }

      const messages = await this.getMessages(sessionId);
      const agent = createAgent(this.env);
      const summary = await agent.summarizeConversation(messages);

      return this.jsonResponse(
        { success: true, summary },
        corsHeaders
      );
    } catch (error) {
      console.error('Summarize error:', error);
      return this.jsonResponse(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        corsHeaders,
        500
      );
    }
  }

  /**
   * Save message to database
   */
  private async saveMessage(sessionId: string, role: string, content: string): Promise<void> {
    await this.env.DB.prepare(
      'INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)'
    ).bind(sessionId, role, content).run();
  }

  /**
   * Get messages from database
   */
  private async getMessages(sessionId: string): Promise<Message[]> {
    const { results } = await this.env.DB.prepare(
      'SELECT role, content, timestamp FROM messages WHERE session_id = ? ORDER BY timestamp ASC'
    ).bind(sessionId).all();

    return results.map(r => ({
      role: r.role as 'user' | 'assistant',
      content: r.content as string,
      timestamp: r.timestamp as string,
    }));
  }

  /**
   * Serve frontend
   */
  private handleFrontend(corsHeaders: HeadersInit): Response {
    // In production, this would serve from Cloudflare Pages or R2
    return new Response('Frontend HTML here', {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html',
      },
    });
  }

  /**
   * Create JSON response
   */
  private jsonResponse(
    data: any,
    corsHeaders: HeadersInit,
    status: number = 200
  ): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get CORS headers
   */
  private getCorsHeaders(): HeadersInit {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
  }
}

/**
 * Factory function to create server instance
 */
export function createServer(env: Env): Server {
  return new Server(env);
}