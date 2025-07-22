import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { CreateFact } from '@/types/fact';

const createModel = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }
  
  return new ChatGoogleGenerativeAI({
    model: 'gemini-2.0-flash-exp',
    apiKey: process.env.GEMINI_API_KEY,
    temperature: 0.1,
  });
};

const FACT_EXTRACTION_PROMPT = `
You are a fact extraction AI. Your job is to extract structured facts from user messages.

Extract facts in the following JSON format:
{
  "facts": [
    {
      "subject": "user",
      "predicate": "relationship_or_action",
      "object": "value_or_entity"
    }
  ]
}

Guidelines:
- Extract only factual information about the user
- Use "user" as the subject for personal facts
- Use clear, concise predicates (e.g., "lives_in", "works_as", "likes", "plays", "owns")
- Extract multiple facts if present
- Return empty array if no facts are found
- Do not extract opinions, questions, or temporary states

Examples:
- "I live in New York and work as a teacher" → [{"subject": "user", "predicate": "lives_in", "object": "New York"}, {"subject": "user", "predicate": "works_as", "object": "teacher"}]
- "My favorite color is blue" → [{"subject": "user", "predicate": "favorite_color", "object": "blue"}]
- "What's the weather like?" → []

Message to analyze: "{message}"

Respond only with valid JSON:
`;

export const extractFacts = async (message: string, userId: string): Promise<CreateFact[]> => {
  try {
    const model = createModel();
    const prompt = FACT_EXTRACTION_PROMPT.replace('{message}', message);
    const response = await model.invoke(prompt);
    
    // Parse the response content
    const content = response.content.toString();
    let jsonContent = content;
    
    // Try to extract JSON from markdown code blocks if present
    const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1];
    }
    
    const parsed = JSON.parse(jsonContent);
    
    if (!parsed.facts || !Array.isArray(parsed.facts)) {
      console.warn('Invalid fact extraction response format');
      return [];
    }
    
    // Validate and transform facts
    const facts: CreateFact[] = parsed.facts
      .filter((fact: { subject?: string; predicate?: string; object?: string }) => 
        fact && 
        typeof fact.subject === 'string' && 
        typeof fact.predicate === 'string' && 
        typeof fact.object === 'string'
      )
      .map((fact: { subject: string; predicate: string; object: string }) => ({
        subject: fact.subject,
        predicate: fact.predicate,
        object: fact.object,
        userId,
      }));
    
    return facts;
  } catch (error) {
    console.error('Error extracting facts:', error);
    return [];
  }
}; 