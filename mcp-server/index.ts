import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import express from 'express';
import { randomUUID } from 'crypto';
import { FactDatabase } from './src/database.js';
import type { CreateFact, UpdateFact, Fact } from './src/types.js';

// Initialize database
const db = new FactDatabase();

// Create MCP server
const server = new McpServer({
  name: 'memory-context-server',
  version: '1.0.0',
});

// Register fact management tools
server.registerTool(
  'create-fact',
  {
    title: 'Create Fact',
    description: 'Create a new fact in memory',
    inputSchema: {
      subject: z.string().describe('The subject of the fact'),
      predicate: z.string().describe('The predicate/relationship'),
      object: z.string().describe('The object/value'),
      userId: z.string().describe('User ID'),
    },
  },
  async ({ subject, predicate, object, userId }) => {
    try {
      const fact = await db.createFact({
        subject,
        predicate,
        object,
        userId,
        timestamp: new Date().toISOString(),
      });

      return {
        content: [
          {
            type: 'text',
            text: `Created fact: ${fact.subject} ${fact.predicate} ${fact.object}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error creating fact: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.registerTool(
  'get-facts',
  {
    title: 'Get Facts',
    description: 'Retrieve facts for a user',
    inputSchema: {
      userId: z.string().describe('User ID'),
      subject: z.string().optional().describe('Filter by subject'),
      predicate: z.string().optional().describe('Filter by predicate'),
      limit: z.number().optional().describe('Maximum number of facts to return'),
    },
  },
  async ({ userId, subject, predicate, limit }) => {
    try {
      const query: any = { userId };
      if (subject) query.subject = subject;
      if (predicate) query.predicate = predicate;
      if (limit) query.limit = limit;

      const { facts } = await db.getFacts(query);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              userId,
              facts,
              totalCount: facts.length,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error retrieving facts: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.registerTool(
  'update-fact',
  {
    title: 'Update Fact',
    description: 'Update an existing fact',
    inputSchema: {
      id: z.string().describe('Fact ID'),
      subject: z.string().optional().describe('New subject'),
      predicate: z.string().optional().describe('New predicate'),
      object: z.string().optional().describe('New object'),
    },
  },
  async ({ id, subject, predicate, object }) => {
    try {
      const updates: UpdateFact = {};
      if (subject) updates.subject = subject;
      if (predicate) updates.predicate = predicate;
      if (object) updates.object = object;

      const fact = await db.updateFact(id, updates);
      
      if (!fact) {
        return {
          content: [
            {
              type: 'text',
              text: `Fact with ID ${id} not found`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: `Updated fact: ${fact.subject} ${fact.predicate} ${fact.object}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error updating fact: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.registerTool(
  'delete-fact',
  {
    title: 'Delete Fact',
    description: 'Delete a fact from memory',
    inputSchema: {
      id: z.string().describe('Fact ID'),
    },
  },
  async ({ id }) => {
    try {
      const deleted = await db.deleteFact(id);
      
      if (!deleted) {
        return {
          content: [
            {
              type: 'text',
              text: `Fact with ID ${id} not found`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: `Deleted fact with ID: ${id}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error deleting fact: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Register memory context resource
server.registerResource(
  'memory-context',
  'memory://context/{userId}',
  {
    title: 'Memory Context',
    description: 'User memory context as a structured knowledge graph',
    mimeType: 'application/json',
  },
  async (uri) => {
    try {
      // Extract userId from URI
      const match = uri.href.match(/memory:\/\/context\/(.+)/);
      if (!match) {
        throw new Error('Invalid memory context URI format');
      }
      
      const userId = decodeURIComponent(match[1]);
      const { facts } = await db.getFacts({ userId });

      const memoryContext = {
        userId,
        facts,
        totalCount: facts.length,
        timestamp: new Date().toISOString(),
      };

      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(memoryContext, null, 2),
            mimeType: 'application/json',
          },
        ],
      };
    } catch (error) {
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify({
              error: error instanceof Error ? error.message : 'Unknown error',
              userId: 'unknown',
              facts: [],
              totalCount: 0,
            }, null, 2),
            mimeType: 'application/json',
          },
        ],
      };
    }
  }
);

// Register facts summary resource
server.registerResource(
  'facts-summary',
  'memory://summary/{userId}',
  {
    title: 'Facts Summary',
    description: 'Summary of user facts by predicate',
    mimeType: 'application/json',
  },
  async (uri) => {
    try {
      // Extract userId from URI
      const match = uri.href.match(/memory:\/\/summary\/(.+)/);
      if (!match) {
        throw new Error('Invalid facts summary URI format');
      }
      
      const userId = decodeURIComponent(match[1]);
      const summary = await db.getUserFactsSummary(userId);

      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify({
              userId,
              ...summary,
              timestamp: new Date().toISOString(),
            }, null, 2),
            mimeType: 'application/json',
          },
        ],
      };
    } catch (error) {
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify({
              error: error instanceof Error ? error.message : 'Unknown error',
              userId: 'unknown',
              predicateCount: {},
              totalFacts: 0,
            }, null, 2),
            mimeType: 'application/json',
          },
        ],
      };
    }
  }
);

// HTTP server setup for Streamable HTTP transport
async function setupHttpServer(port: number = 3001) {
  const app = express();
  app.use(express.json());
  
  // CORS headers for Next.js app
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, mcp-session-id');
    res.header('Access-Control-Expose-Headers', 'mcp-session-id');
    
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Store transports by session ID
  const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

  // Handle MCP requests
  app.all('/mcp', async (req, res) => {
    try {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      let transport: StreamableHTTPServerTransport;

      if (sessionId && transports[sessionId]) {
        // Reuse existing transport
        transport = transports[sessionId];
      } else {
        // Create new transport
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sessionId) => {
            transports[sessionId] = transport;
          },
          enableDnsRebindingProtection: false, // Disable for local development
        });

        // Clean up transport when closed
        transport.onclose = () => {
          if (transport.sessionId) {
            delete transports[transport.sessionId];
          }
        };

        // Connect MCP server to transport
        await server.connect(transport);
      }

      // Handle the request
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('Error handling MCP request:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        });
      }
    }
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      server: 'MCP Memory Context Server',
      version: '1.0.0',
    });
  });

  // Start HTTP server
  const httpServer = app.listen(port, () => {
    console.log(`MCP Server running on HTTP transport at http://localhost:${port}`);
    console.log(`MCP endpoint: http://localhost:${port}/mcp`);
    console.log(`Health check: http://localhost:${port}/health`);
  });

  return httpServer;
}

// Main function to start the server
async function main() {
  try {
    // Initialize database connection
    await db.connect();
    console.log('Database connected successfully');

    // Get transport type from command line arguments
    const transportType = process.argv[2] || 'stdio';
    const port = parseInt(process.env.PORT || '3001');

    if (transportType === 'streamable-http') {
      // Start HTTP server for Next.js app
      const httpServer = await setupHttpServer(port);
      
      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        console.log('\nShutting down MCP HTTP server...');
        httpServer.close(() => {
          console.log('HTTP server closed');
        });
        await db.disconnect();
        process.exit(0);
      });

    } else {
      // Default stdio transport for CLI tools
      const stdioTransport = new StdioServerTransport();
      await server.connect(stdioTransport);
      console.log('MCP Server running on stdio transport');
      console.log('Ready to receive MCP messages via stdin/stdout');
    }

  } catch (error) {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down MCP server...');
  await db.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down MCP server...');
  await db.disconnect();
  process.exit(0);
});

if (import.meta.main) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}