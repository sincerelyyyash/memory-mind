import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { Message } from '@/types/message';
import { MemoryContext } from '@/types/fact';

export const createChatModel = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }
  
  return new ChatGoogleGenerativeAI({
    model: 'gemini-2.0-flash-exp',
    apiKey: process.env.GEMINI_API_KEY,
    temperature: 0.7,
    streaming: true,
  });
};

export const formatSystemPrompt = (memoryContext: MemoryContext): string => {
  let systemPrompt = `You are AI Chat with Memory, a helpful AI assistant created by Townsquare. You have access to the user's personal context and memory, which allows you to provide highly personalized and contextual responses.

Your conversation style should be:
- Conversational, friendly, and engaging
- Naturally reference relevant personal context when appropriate
- Helpful and informative
- Show genuine interest in the user's life and experiences
- Remember and build upon previous conversations

`;

  if (memoryContext.facts && memoryContext.facts.length > 0) {
    systemPrompt += `\n=== WHAT YOU KNOW ABOUT THE USER ===\n`;
    
    // Group facts by predicate for better organization
    const factsByPredicate = memoryContext.facts.reduce((acc, fact) => {
      if (!acc[fact.predicate]) {
        acc[fact.predicate] = [];
      }
      acc[fact.predicate].push(fact.object);
      return acc;
    }, {} as Record<string, string[]>);

    Object.entries(factsByPredicate).forEach(([predicate, objects]) => {
      const predicateLabel = predicate.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      systemPrompt += `• ${predicateLabel}: ${objects.join(', ')}\n`;
    });
    
    systemPrompt += `\n=== IMPORTANT GUIDELINES ===
- Use this personal information naturally in conversations when relevant
- Reference specific details to show you remember and care
- Ask follow-up questions that build on what you know
- Don't just list facts back - weave them into natural conversation
- If the user mentions something that contradicts what you know, acknowledge the change
- Show genuine interest in their life, hobbies, and experiences

For example:
- If they mention being tired, and you know they work as a teacher, you might say "Teaching can be exhausting - how are your students doing this week?"
- If they ask about events and you know their location and interests, provide personalized recommendations
- If they mention their favorite team, show enthusiasm and ask about recent games

`;
  } else {
    systemPrompt += `\nI don't have any specific personal context about you yet, but I'm eager to learn! I'll remember important details from our conversation to make future interactions more personalized and helpful.\n\n`;
  }

  // Add debug info (remove in production)
  if (process.env.NODE_ENV === 'development') {
    console.log('Memory Context for System Prompt:');
    console.log('Facts count:', memoryContext.facts?.length || 0);
    if (memoryContext.facts && memoryContext.facts.length > 0) {
      console.log('Facts:', memoryContext.facts.map(f => `${f.predicate}: ${f.object}`));
    }
  }

  return systemPrompt;
};

export const formatMessagesForLangChain = (
  messages: Message[],
  memoryContext: MemoryContext
) => {
  const systemMessage = new SystemMessage(formatSystemPrompt(memoryContext));
  
  const chatMessages = messages.map(message => {
    if (message.role === 'user') {
      return new HumanMessage(message.content);
    } else {
      return new AIMessage(message.content);
    }
  });

  return [systemMessage, ...chatMessages];
}; 