/**
 * Type definitions for Cloudflare AI Chat Application
 */

export interface Env {
    AI: Ai;
    DB: D1Database;
    CHAT_SESSION: DurableObjectNamespace;
  }
  
  export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: string;
  }
  
  export interface ChatRequest {
    message: string;
    sessionId: string;
    conversationHistory?: Message[];
  }
  
  export interface ChatResponse {
    success: boolean;
    message?: Message;
    error?: string;
  }
  
  export interface HistoryResponse {
    success: boolean;
    messages?: Message[];
    error?: string;
  }
  
  export interface AIResponse {
    response?: string;
    result?: {
      response: string;
    };
  }
  
  export interface AgentConfig {
    model: string;
    maxTokens: number;
    temperature: number;
    systemPrompt?: string;
  }
  
  export interface AgentContext {
    sessionId: string;
    conversationHistory: Message[];
    userMessage: string;
  }
  
  export interface AgentResponse {
    content: string;
    shouldContinue: boolean;
    metadata?: Record<string, any>;
  }
  
  export interface WorkflowStep {
    name: string;
    execute: (context: AgentContext) => Promise<any>;
  }
  
  export interface DBMessage {
    id: number;
    session_id: string;
    role: string;
    content: string;
    timestamp: string;
  }