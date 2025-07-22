import { z } from 'zod';

export const FactSchema = z.object({
  id: z.string(),
  subject: z.string(),
  predicate: z.string(),
  object: z.string(),
  userId: z.string().optional(),
  timestamp: z.date().optional(),
});

export interface Fact {
  id: string;
  subject: string;
  predicate: string;
  object: string;
  userId?: string;
  timestamp?: Date;
}

export const CreateFactSchema = z.object({
  subject: z.string(),
  predicate: z.string(),
  object: z.string(),
  userId: z.string(),
});

export type CreateFact = z.infer<typeof CreateFactSchema>;

export const MemoryContextSchema = z.object({
  userId: z.string(),
  facts: z.array(FactSchema),
});

export type MemoryContext = z.infer<typeof MemoryContextSchema>; 