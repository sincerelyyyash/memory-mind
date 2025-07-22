import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { FactDatabase } from './database.js';
import { CreateFactSchema, UpdateFactSchema, QuerySchema } from './types.js';
import type { MemoryContext } from './types.js';

const router = Router();

// Initialize database
const db = new FactDatabase();

// Middleware for error handling
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// POST /context - Create a new fact
router.post('/context', asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const validation = CreateFactSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: validation.error.errors,
      });
    }

    const fact = await db.createFact(validation.data);
    
    res.status(201).json({
      success: true,
      fact,
      message: 'Fact created successfully',
    });
  } catch (error) {
    console.error('Error creating fact:', error);
    res.status(500).json({
      error: 'Failed to create fact',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}));

// GET /context - Retrieve facts (with optional filtering)
router.get('/context', asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const queryParams = {
      userId: req.query.userId as string,
      subject: req.query.subject as string,
      predicate: req.query.predicate as string,
      object: req.query.object as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
    };

    // Remove undefined values
    const cleanedQuery = Object.fromEntries(
      Object.entries(queryParams).filter(([_, value]) => value !== undefined)
    );

    const validation = QuerySchema.safeParse(cleanedQuery);
    
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: validation.error.errors,
      });
    }

    const { facts, totalCount } = await db.getFacts(validation.data);
    
    // Format response based on whether userId is provided
    if (req.query.userId) {
      const memoryContext: MemoryContext = {
        userId: req.query.userId as string,
        facts,
        totalCount,
      };
      
      res.json(memoryContext);
    } else {
      res.json({
        facts,
        totalCount,
        pagination: {
          limit: validation.data.limit || 100,
          offset: validation.data.offset || 0,
        },
      });
    }
  } catch (error) {
    console.error('Error retrieving facts:', error);
    res.status(500).json({
      error: 'Failed to retrieve facts',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}));

// GET /context/:id - Retrieve a specific fact by ID
router.get('/context/:id', asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        error: 'Fact ID is required',
      });
    }

    const fact = await db.getFactById(id);
    
    if (!fact) {
      return res.status(404).json({
        error: 'Fact not found',
      });
    }

    res.json({
      success: true,
      fact,
    });
  } catch (error) {
    console.error('Error retrieving fact:', error);
    res.status(500).json({
      error: 'Failed to retrieve fact',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}));

// PUT /context/:id - Update a fact
router.put('/context/:id', asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        error: 'Fact ID is required',
      });
    }

    const validation = UpdateFactSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: validation.error.errors,
      });
    }

    const updatedFact = await db.updateFact(id, validation.data);
    
    if (!updatedFact) {
      return res.status(404).json({
        error: 'Fact not found',
      });
    }

    res.json({
      success: true,
      fact: updatedFact,
      message: 'Fact updated successfully',
    });
  } catch (error) {
    console.error('Error updating fact:', error);
    res.status(500).json({
      error: 'Failed to update fact',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}));

// DELETE /context/:id - Delete a fact
router.delete('/context/:id', asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        error: 'Fact ID is required',
      });
    }

    const deleted = await db.deleteFact(id);
    
    if (!deleted) {
      return res.status(404).json({
        error: 'Fact not found',
      });
    }

    res.json({
      success: true,
      message: 'Fact deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting fact:', error);
    res.status(500).json({
      error: 'Failed to delete fact',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}));

// DELETE /context/user/:userId - Delete all facts for a user
router.delete('/context/user/:userId', asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        error: 'User ID is required',
      });
    }

    const deletedCount = await db.deleteAllFactsForUser(userId);
    
    res.json({
      success: true,
      deletedCount,
      message: `Deleted ${deletedCount} facts for user ${userId}`,
    });
  } catch (error) {
    console.error('Error deleting user facts:', error);
    res.status(500).json({
      error: 'Failed to delete user facts',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}));

// GET /context/user/:userId/summary - Get facts summary for a user
router.get('/context/user/:userId/summary', asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        error: 'User ID is required',
      });
    }

    const summary = await db.getUserFactsSummary(userId);
    
    res.json({
      success: true,
      userId,
      summary,
    });
  } catch (error) {
    console.error('Error getting facts summary:', error);
    res.status(500).json({
      error: 'Failed to get facts summary',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}));

// GET /health - Health check endpoint
router.get('/health', asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const isHealthy = await db.isHealthy();
    
    if (isHealthy) {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected',
      });
    } else {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}));

// Initialize database connection
export const initializeDatabase = async () => {
  try {
    await db.connect();
    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
};

export default router; 