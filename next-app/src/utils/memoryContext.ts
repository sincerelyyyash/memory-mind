import { MemoryContext, Fact } from '@/types/fact';

export const mergeMemoryContexts = (
  existing: MemoryContext,
  newFacts: Fact[]
): MemoryContext => {
  // Remove duplicates and merge
  const allFacts = [...existing.facts, ...newFacts];
  const uniqueFacts = allFacts.filter((fact, index, self) => 
    index === self.findIndex(f => 
      f.subject === fact.subject && 
      f.predicate === fact.predicate && 
      f.object === fact.object
    )
  );

  return {
    userId: existing.userId,
    facts: uniqueFacts,
  };
};

export const filterRelevantFacts = (
  memoryContext: MemoryContext,
  query: string
): MemoryContext => {
  const queryLower = query.toLowerCase();
  
  const relevantFacts = memoryContext.facts.filter(fact => 
    fact.subject.toLowerCase().includes(queryLower) ||
    fact.predicate.toLowerCase().includes(queryLower) ||
    fact.object.toLowerCase().includes(queryLower)
  );

  return {
    userId: memoryContext.userId,
    facts: relevantFacts,
  };
};

export const summarizeMemoryContext = (memoryContext: MemoryContext): string => {
  if (memoryContext.facts.length === 0) {
    return 'No stored information about the user.';
  }

  const factsByPredicate = memoryContext.facts.reduce((acc, fact) => {
    if (!acc[fact.predicate]) {
      acc[fact.predicate] = [];
    }
    acc[fact.predicate].push(fact.object);
    return acc;
  }, {} as Record<string, string[]>);

  const summary = Object.entries(factsByPredicate)
    .map(([predicate, objects]) => 
      `${predicate.replace('_', ' ')}: ${objects.join(', ')}`
    )
    .join('; ');

  return `User information: ${summary}`;
}; 