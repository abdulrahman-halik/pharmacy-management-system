import { z } from 'zod';

export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string(),
  name: z.string().optional(),
  timestamp: z.string().optional(),
});

export const AiChatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(2000, 'Message too long'),
  conversationHistory: z.array(ChatMessageSchema).max(20).optional().default([]),
});

export const LowStockToolParamsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(10),
});

export const ExpiringBatchesToolParamsSchema = z.object({
  days: z.number().int().min(1).max(365).default(30),
});

export const ProfitSummaryToolParamsSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
});

export const StockLevelToolParamsSchema = z.object({
  medicineName: z.string().min(1),
});

export const SalesTotalsToolParamsSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
});
