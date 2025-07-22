import { Fact, CreateFact, MemoryContext } from '@/types/fact';

class MCPClient {
  private serverUrl: string;
  private sessionId: string | null = null;
  private initialized = false;

  constructor() {
    this.serverUrl = process.env.MCP_SERVER_URL || 'http://localhost:3001/mcp';
  }

  private async makeRequest(method: string, params: any): Promise<any> {
    // Always initialize first if not done
    if (!this.initialized && method !== 'initialize') {
      await this.initialize();
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    };

    // Include session ID if we have one
    if (this.sessionId) {
      headers['mcp-session-id'] = this.sessionId;
    }

    const response = await fetch(this.serverUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Capture session ID from response
    const newSessionId = response.headers.get('mcp-session-id');
    if (newSessionId) {
      this.sessionId = newSessionId;
    }

    const responseText = await response.text();
    
    // Handle Server-Sent Events format
    if (responseText.includes('event: message')) {
      const lines = responseText.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.substring(6);
          const parsed = JSON.parse(jsonStr);
          
          if (parsed.error) {
            throw new Error(`MCP error: ${parsed.error.message}`);
          }
          
          if (parsed.result !== undefined) {
            return parsed.result;
          }
        }
      }
      throw new Error('No valid result found in SSE response');
    } else {
      // Handle regular JSON response
      const result = await JSON.parse(responseText);
      if (result.error) {
        throw new Error(`MCP error: ${result.error.message}`);
      }
      return result.result;
    }
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.makeRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {
          roots: { listChanged: false },
          sampling: {}
        },
        clientInfo: {
          name: 'chat-app-client',
          version: '1.0.0'
        }
      });

      this.initialized = true;
      console.log('MCP client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize MCP client:', error);
      throw error;
    }
  }

  async connect() {
    await this.initialize();
    console.log('MCP client ready');
  }

  async disconnect() {
    this.sessionId = null;
    this.initialized = false;
    console.log('MCP client disconnected');
  }

  async pushFact(fact: CreateFact): Promise<boolean> {
    try {
      await this.makeRequest('tools/call', {
        name: 'create-fact',
        arguments: {
          subject: fact.subject,
          predicate: fact.predicate,
          object: fact.object,
          userId: fact.userId,
        },
      });
      return true;
    } catch (error) {
      console.error('Error pushing fact to MCP server:', error);
      return false;
    }
  }

  async getMemoryContext(userId: string): Promise<MemoryContext> {
    try {
      const result = await this.makeRequest('tools/call', {
        name: 'get-facts',
        arguments: { userId },
      });

      if (!result.content || !Array.isArray(result.content) || result.content.length === 0) {
        return { userId, facts: [] };
      }

      const firstContent = result.content[0];
      if (!firstContent || !('text' in firstContent)) {
        return { userId, facts: [] };
      }

      const data = JSON.parse(firstContent.text);
      return {
        userId: data.userId || userId,
        facts: data.facts || [],
      };
    } catch (error) {
      console.error('Error retrieving memory context from MCP server:', error);
      return { userId, facts: [] };
    }
  }

  async updateFact(factId: string, updatedFact: Partial<Fact>): Promise<boolean> {
    try {
      await this.makeRequest('tools/call', {
        name: 'update-fact',
        arguments: {
          id: factId,
          ...(updatedFact.subject && { subject: updatedFact.subject }),
          ...(updatedFact.predicate && { predicate: updatedFact.predicate }),
          ...(updatedFact.object && { object: updatedFact.object }),
        },
      });
      return true;
    } catch (error) {
      console.error('Error updating fact in MCP server:', error);
      return false;
    }
  }

  async deleteFact(factId: string): Promise<boolean> {
    try {
      await this.makeRequest('tools/call', {
        name: 'delete-fact',
        arguments: { id: factId },
      });
      return true;
    } catch (error) {
      console.error('Error deleting fact from MCP server:', error);
      return false;
    }
  }

  async getMemoryContextAsResource(userId: string): Promise<MemoryContext> {
    try {
      const result = await this.makeRequest('resources/read', {
        uri: `memory://context/${encodeURIComponent(userId)}`,
      });

      if (!result.contents || result.contents.length === 0) {
        return { userId, facts: [] };
      }

      const content = result.contents[0];
      const textContent = typeof content.text === 'string' ? content.text : '{"userId": "", "facts": []}';
      const data = JSON.parse(textContent);

      return {
        userId: data.userId || userId,
        facts: data.facts || [],
      };
    } catch (error) {
      console.error('Error retrieving memory context resource from MCP server:', error);
      return { userId, facts: [] };
    }
  }
}

// Create singleton instance
const mcpClient = new MCPClient();

// Export the methods
export const pushFact = (fact: CreateFact): Promise<boolean> => mcpClient.pushFact(fact);
export const getMemoryContext = (userId: string): Promise<MemoryContext> => mcpClient.getMemoryContext(userId);
export const updateFact = (factId: string, updatedFact: Partial<Fact>): Promise<boolean> => mcpClient.updateFact(factId, updatedFact);
export const deleteFact = (factId: string): Promise<boolean> => mcpClient.deleteFact(factId);

// Export client instance for advanced usage
export { mcpClient };

// Graceful cleanup on process exit
process.on('SIGINT', async () => {
  await mcpClient.disconnect();
});

process.on('SIGTERM', async () => {
  await mcpClient.disconnect();
});