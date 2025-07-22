import { z } from 'zod';

export const MessageSchema = z.object({
  id: z.string(),
  userId: z.string(),
  content: z.string(),
  role: z.enum(['user', 'assistant']),
  timestamp: z.date(),
});

export type Message = z.infer<typeof MessageSchema>;

export const CreateMessageSchema = z.object({
  userId: z.string(),
  content: z.string(),
  role: z.enum(['user', 'assistant']),
});

export type CreateMessage = z.infer<typeof CreateMessageSchema>; 