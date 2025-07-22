import { z } from 'zod';

// Fact schema matching the Next.js app
export const FactSchema = z.object({
  id: z.string().optional(),
  subject: z.string().min(1),
  predicate: z.string().min(1),
  object: z.string().min(1),
  userId: z.string().min(1),
  timestamp: z.string().datetime().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const CreateFactSchema = z.object({
  subject: z.string().min(1),
  predicate: z.string().min(1),
  object: z.string().min(1),
  userId: z.string().min(1),
  timestamp: z.string().datetime().optional(),
});

export const UpdateFactSchema = z.object({
  subject: z.string().min(1).optional(),
  predicate: z.string().min(1).optional(),
  object: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
});

export const QuerySchema = z.object({
  userId: z.string().min(1).optional(),
  subject: z.string().optional(),
  predicate: z.string().optional(),
  object: z.string().optional(),
  limit: z.number().int().positive().max(1000).optional(),
  offset: z.number().int().min(0).optional(),
});

export type Fact = z.infer<typeof FactSchema>;
export type CreateFact = z.infer<typeof CreateFactSchema>;
export type UpdateFact = z.infer<typeof UpdateFactSchema>;
export type Query = z.infer<typeof QuerySchema>;

export interface MemoryContext {
  userId: string;
  facts: Fact[];
  totalCount: number;
} 