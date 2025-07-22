import { Fact, CreateFact, MemoryContext } from '@/types/fact';

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3001';

export const pushFact = async (fact: CreateFact): Promise<boolean> => {
  try {
    const response = await fetch(`${MCP_SERVER_URL}/context`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subject: fact.subject,
        predicate: fact.predicate,
        object: fact.object,
        userId: fact.userId,
        timestamp: new Date().toISOString(),
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error pushing fact to MCP server:', error);
    return false;
  }
};

export const getMemoryContext = async (userId: string): Promise<MemoryContext> => {
  try {
    const response = await fetch(`${MCP_SERVER_URL}/context?userId=${encodeURIComponent(userId)}`);
    
    if (!response.ok) {
      throw new Error(`MCP server responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      userId,
      facts: data.facts || [],
    };
  } catch (error) {
    console.error('Error retrieving memory context from MCP server:', error);
    // Return empty context on error
    return {
      userId,
      facts: [],
    };
  }
};

export const updateFact = async (factId: string, updatedFact: Partial<Fact>): Promise<boolean> => {
  try {
    const response = await fetch(`${MCP_SERVER_URL}/context/${factId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedFact),
    });

    return response.ok;
  } catch (error) {
    console.error('Error updating fact in MCP server:', error);
    return false;
  }
};

export const deleteFact = async (factId: string): Promise<boolean> => {
  try {
    const response = await fetch(`${MCP_SERVER_URL}/context/${factId}`, {
      method: 'DELETE',
    });

    return response.ok;
  } catch (error) {
    console.error('Error deleting fact from MCP server:', error);
    return false;
  }
}; 