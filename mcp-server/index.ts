import express from 'express';
import cors from 'cors';
import router, { initializeDatabase } from './src/routes.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Parse allowed origins from environment variable
const getAllowedOrigins = (): string[] => {
  const origins = process.env.ALLOWED_ORIGINS || 'http://localhost:3000';
  return origins.split(',').map(origin => origin.trim());
};

// CORS configuration
const corsOptions = {
  origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = getAllowedOrigins();
    
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - ${req.method} ${req.path}`);
  next();
});

// API routes
app.use('/', router);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'MCP Server',
    version: '1.0.0',
    description: 'Model Context Protocol server for AI chat memory management',
    endpoints: {
      health: 'GET /health',
      createFact: 'POST /context',
      getFacts: 'GET /context',
      getFactById: 'GET /context/:id',
      updateFact: 'PUT /context/:id',
      deleteFact: 'DELETE /context/:id',
      deleteUserFacts: 'DELETE /context/user/:userId',
      getUserSummary: 'GET /context/user/:userId/summary',
    },
    documentation: 'See README.md for detailed API documentation',
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    availableEndpoints: [
      'GET /',
      'GET /health',
      'POST /context',
      'GET /context',
      'GET /context/:id',
      'PUT /context/:id',
      'DELETE /context/:id',
      'DELETE /context/user/:userId',
      'GET /context/user/:userId/summary',
    ],
  });
});

// Global error handler
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler:', error);
  
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'CORS Error',
      message: 'Origin not allowed',
    });
  }

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
  });
});

// Make server variable available for graceful shutdown
let server: any;

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  console.log(`
${signal} received. Shutting down gracefully...`);
  
  if (server) {
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  } else {
    console.log('No server to close');
    process.exit(0);
  }

  // Force close after 10 seconds
  setTimeout(() => {
    console.log('Forcing shutdown...');
    process.exit(1);
  }, 10000);
};

// Start server
const startServer = async () => {
  try {
    // Initialize database connection
    await initializeDatabase();
    
    // Start HTTP server
    server = app.listen(PORT, () => {
      console.log('\nMCP Server started successfully!');
      console.log(`Server running on port: ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('\nReady to accept requests...\n');
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    return server;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Export for testing
export { app };

// Start server if this file is run directly
const isMainModule = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isMainModule) {
  startServer();
}