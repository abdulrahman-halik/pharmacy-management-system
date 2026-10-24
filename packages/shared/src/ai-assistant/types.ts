import { AiAssistantToolName } from './constants.js';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  name?: string;
  timestamp?: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: AiAssistantToolName;
  arguments: Record<string, any>;
}

export interface ToolResult {
  toolCallId: string;
  name: string;
  result?: any;
  error?: string;
}

export interface AiChatRequest {
  message: string;
  conversationHistory?: ChatMessage[];
}

export interface AiChatResponse {
  reply: string;
  toolsExecuted: Array<{
    name: string;
    params: any;
    status: 'SUCCESS' | 'FORBIDDEN' | 'ERROR';
    resultSnippet?: any;
  }>;
  deniedTools?: string[];
}

export interface ToolDefinition {
  name: AiAssistantToolName;
  description: string;
  requiredPermission: { module: string; action: string };
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}
