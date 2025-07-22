import { MemoryContext } from '@/types/fact';

export const injectMemoryIntoPrompt = (prompt: string, memoryContext: MemoryContext): string => {
  if (memoryContext.facts.length === 0) {
    return prompt;
  }

  const memorySection = memoryContext.facts
    .map(fact => `${fact.subject} ${fact.predicate.replace('_', ' ')}: ${fact.object}`)
    .join('\n');

  return `${prompt}\n\nContext about the user:\n${memorySection}`;
};

export const formatFactsAsContext = (memoryContext: MemoryContext): string => {
  if (memoryContext.facts.length === 0) {
    return 'No previous context available.';
  }

  return memoryContext.facts
    .map(fact => `• ${fact.subject} ${fact.predicate.replace('_', ' ')}: ${fact.object}`)
    .join('\n');
}; 