import { Fact, CreateFact, MemoryContext } from '@/types/fact';

// MCP Protocol types
interface MCPRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params: Record<string, unknown>;
}

interface MCPResponse<T = unknown> {
  jsonrpc: '2.0';
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

interface MCPInitializeParams extends Record<string, unknown> {
  protocolVersion: string;
  capabilities: {
    roots: { listChanged: boolean };
    sampling: Record<string, unknown>;
  };
  clientInfo: {
    name: string;
    version: string;
  };
}

interface MCPToolCallParams extends Record<string, unknown> {
  name: string;
  arguments: Record<string, unknown>;
}

interface MCPResourceReadParams extends Record<string, unknown> {
  uri: string;
}

interface MCPToolResult {
  content?: Array<{
    type: string;
    text: string;
  }>;
}

interface MCPResourceResult {
  contents: Array<{
    uri: string;
    mimeType?: string;
    text: string;
  }>;
}

interface CreateFactArguments extends Record<string, unknown> {
  subject: string;
  predicate: string;
  object: string;
  userId: string;
}

interface GetFactsArguments extends Record<string, unknown> {
  userId: string;
}

interface UpdateFactArguments extends Record<string, unknown> {
  id: string;
  subject?: string;
  predicate?: string;
  object?: string;
}

interface DeleteFactArguments extends Record<string, unknown> {
  id: string;
}

// Circuit breaker implementation
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private failureThreshold = 5,
    private recoveryTimeout = 30000 // 30 seconds
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
        console.log('Circuit breaker transitioning to HALF_OPEN');
      } else {
        throw new Error('Circuit breaker is OPEN - MCP server unavailable');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      console.warn(`Circuit breaker OPEN after ${this.failures} failures`);
    }
  }

  getState() {
    return this.state;
  }
}

class MCPClient {
  private serverUrl: string;
  private sessionId: string | null = null;
  private initialized = false;
  private circuitBreaker = new CircuitBreaker();
  private readonly timeout = 15000; // 15 seconds
  private readonly retryAttempts = 3;
  private readonly retryDelay = 1000; // 1 second

  constructor() {
    this.serverUrl = process.env.MCP_SERVER_URL || 'http://localhost:3001/mcp';
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeoutMs}ms`);
      }
      throw error;
    }
  }

  private async makeRequestWithRetry<T = unknown>(method: string, params: Record<string, unknown>): Promise<T> {
    return this.circuitBreaker.execute(async () => {
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
        try {
          if (attempt > 1) {
            console.log(`🔄 MCP request retry attempt ${attempt}/${this.retryAttempts} for method: ${method}`);
            await this.sleep(this.retryDelay * attempt); // Exponential backoff
          }

          return await this.makeRequest<T>(method, params);
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          
          // Don't retry on certain errors
          if (lastError.message.includes('400') || lastError.message.includes('401') || lastError.message.includes('403')) {
            throw lastError;
          }

          if (attempt === this.retryAttempts) {
            console.error(`❌ MCP request failed after ${this.retryAttempts} attempts:`, lastError.message);
            break;
          }

          console.warn(`⚠️ MCP request attempt ${attempt} failed: ${lastError.message}`);
        }
      }

      throw lastError || new Error('Unknown error during retry attempts');
    });
  }

  private async makeRequest<T = unknown>(method: string, params: Record<string, unknown>): Promise<T> {
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

    const requestBody: MCPRequest = {
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    };

    const response = await this.fetchWithTimeout(this.serverUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    }, this.timeout);

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
          const parsed: MCPResponse<T> = JSON.parse(jsonStr);
          
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
      const result: MCPResponse<T> = JSON.parse(responseText);
      if (result.error) {
        throw new Error(`MCP error: ${result.error.message}`);
      }
      if (result.result === undefined) {
        throw new Error('No result found in response');
      }
      return result.result;
    }
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const initParams: MCPInitializeParams = {
        protocolVersion: '2024-11-05',
        capabilities: {
          roots: { listChanged: false },
          sampling: {}
        },
        clientInfo: {
          name: 'chat-app-client',
          version: '1.0.0'
        }
      };

      await this.makeRequest<void>('initialize', initParams);

      this.initialized = true;
      console.log('✅ MCP client initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize MCP client:', error);
      throw error;
    }
  }

  async connect(): Promise<void> {
    await this.initialize();
    console.log('✅ MCP client ready');
  }

  async disconnect(): Promise<void> {
    this.sessionId = null;
    this.initialized = false;
    console.log('🔌 MCP client disconnected');
  }

  async pushFact(fact: CreateFact): Promise<boolean> {
    try {
      const toolParams: MCPToolCallParams = {
        name: 'create-fact',
        arguments: {
          subject: fact.subject,
          predicate: fact.predicate,
          object: fact.object,
          userId: fact.userId,
        } as CreateFactArguments,
      };

      await this.makeRequestWithRetry<MCPToolResult>('tools/call', toolParams);
      return true;
    } catch (error) {
      console.error('❌ Error pushing fact to MCP server:', error);
      return false;
    }
  }

  async getMemoryContext(userId: string): Promise<MemoryContext> {
    try {
      const toolParams: MCPToolCallParams = {
        name: 'get-facts',
        arguments: { userId } as GetFactsArguments,
      };

      const result = await this.makeRequestWithRetry<MCPToolResult>('tools/call', toolParams);

      if (!result.content || !Array.isArray(result.content) || result.content.length === 0) {
        return { userId, facts: [] };
      }

      const firstContent = result.content[0];
      if (!firstContent || !('text' in firstContent)) {
        return { userId, facts: [] };
      }

      const data: { userId?: string; facts?: Fact[] } = JSON.parse(firstContent.text);
      return {
        userId: data.userId || userId,
        facts: data.facts || [],
      };
    } catch (error) {
      console.error('❌ Error retrieving memory context from MCP server:', error);
      // Return empty context on error to allow chat to continue
      return { userId, facts: [] };
    }
  }

  async updateFact(factId: string, updatedFact: Partial<Fact>): Promise<boolean> {
    try {
      const updateArgs: UpdateFactArguments = {
        id: factId,
        ...(updatedFact.subject && { subject: updatedFact.subject }),
        ...(updatedFact.predicate && { predicate: updatedFact.predicate }),
        ...(updatedFact.object && { object: updatedFact.object }),
      };

      const toolParams: MCPToolCallParams = {
        name: 'update-fact',
        arguments: updateArgs,
      };

      await this.makeRequestWithRetry<MCPToolResult>('tools/call', toolParams);
      return true;
    } catch (error) {
      console.error('❌ Error updating fact in MCP server:', error);
      return false;
    }
  }

  async deleteFact(factId: string): Promise<boolean> {
    try {
      const toolParams: MCPToolCallParams = {
        name: 'delete-fact',
        arguments: { id: factId } as DeleteFactArguments,
      };

      await this.makeRequestWithRetry<MCPToolResult>('tools/call', toolParams);
      return true;
    } catch (error) {
      console.error('❌ Error deleting fact from MCP server:', error);
      return false;
    }
  }

  async getMemoryContextAsResource(userId: string): Promise<MemoryContext> {
    try {
      const resourceParams: MCPResourceReadParams = {
        uri: `memory://context/${encodeURIComponent(userId)}`,
      };

      const result = await this.makeRequestWithRetry<MCPResourceResult>('resources/read', resourceParams);

      if (!result.contents || result.contents.length === 0) {
        return { userId, facts: [] };
      }

      const content = result.contents[0];
      const textContent = typeof content.text === 'string' ? content.text : '{"userId": "", "facts": []}';
      const data: { userId?: string; facts?: Fact[] } = JSON.parse(textContent);

      return {
        userId: data.userId || userId,
        facts: data.facts || [],
      };
    } catch (error) {
      console.error('❌ Error retrieving memory context resource from MCP server:', error);
      return { userId, facts: [] };
    }
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      await this.makeRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: { roots: { listChanged: false }, sampling: {} },
        clientInfo: { name: 'health-check', version: '1.0.0' }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  // Get circuit breaker status for monitoring
  getStatus() {
    return {
      circuitBreakerState: this.circuitBreaker.getState(),
      initialized: this.initialized,
      hasSession: !!this.sessionId,
      serverUrl: this.serverUrl
    };
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