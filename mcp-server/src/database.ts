import { PrismaClient } from '@prisma/client';
import type { Fact, CreateFact, UpdateFact, Query } from './types.js';

type PrismaFact = {
  id: string;
  subject: string;
  predicate: string;
  object: string;
  userId: string;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
};

// Simple in-memory cache for frequently accessed data
class FactCache {
  private cache = new Map<string, { data: Fact[], timestamp: number }>();
  private readonly ttl = 60000; // 1 minute TTL

  get(key: string): Fact[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  set(key: string, data: Fact[]): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  invalidateUser(userId: string): void {
    // Remove all entries for this user
    for (const [key] of this.cache) {
      if (key.includes(userId)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

export class FactDatabase {
  private prisma: PrismaClient;
  private cache = new FactCache();
  private isConnected = false;

  constructor() {
    this.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'file:./dev.db',
        },
      },
      // Connection pool configuration
      __internal: {
        engine: {
          connectTimeout: 5000,
          queryTimeout: 10000,
        },
      },
    });
  }

  async connect() {
    if (this.isConnected) return;
    
    try {
      await this.prisma.$connect();
      this.isConnected = true;
      console.log('✅ Connected to SQLite database with optimized settings');
    } catch (error) {
      console.error('❌ Unable to connect to the database:', error);
      throw error; 
    }
  }

  async disconnect() {
    if (!this.isConnected) return;
    
    try {
      await this.prisma.$disconnect();
      this.isConnected = false;
      this.cache.clear();
      console.log('🔌 Disconnected from database');
    } catch (error) {
      console.error('❌ Error disconnecting from database:', error);
    }
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('❌ Database health check failed:', error);
      return false;
    }
  }

  private mapPrismaFactToFact(prismaFact: PrismaFact): Fact {
    return {
      id: prismaFact.id,
      subject: prismaFact.subject,
      predicate: prismaFact.predicate,
      object: prismaFact.object,
      userId: prismaFact.userId,
      timestamp: prismaFact.timestamp.toISOString(),
      createdAt: prismaFact.createdAt.toISOString(),
      updatedAt: prismaFact.updatedAt.toISOString(),
    };
  }

  async createFact(fact: CreateFact): Promise<Fact> {
    try {
      await this.connect(); // Ensure connection
      
      // Check for duplicate first (with timeout)
      const existing = await Promise.race([
        this.findDuplicateFact(fact),
        new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Duplicate check timeout')), 3000)
        )
      ]);
      
      if (existing) {
        return existing;
      }

      const created = await Promise.race([
        this.prisma.fact.create({
          data: {
            subject: fact.subject,
            predicate: fact.predicate,
            object: fact.object,
            userId: fact.userId,
            timestamp: fact.timestamp ? new Date(fact.timestamp) : new Date(),
          },
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Create fact timeout')), 5000)
        )
      ]);

      // Invalidate cache for this user
      this.cache.invalidateUser(fact.userId);
      
      return this.mapPrismaFactToFact(created);
    } catch (error) {
      console.error('❌ Error creating fact:', error);
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new Error('Database operation timeout - please try again');
      }
      throw new Error('Failed to create fact');
    }
  }

  async getFactById(id: string): Promise<Fact | null> {
    try {
      await this.connect(); // Ensure connection
      
      const fact = await Promise.race([
        this.prisma.fact.findUnique({
          where: { id },
        }),
        new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), 3000)
        )
      ]);

      return fact ? this.mapPrismaFactToFact(fact) : null;
    } catch (error) {
      console.error('❌ Error getting fact by ID:', error);
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new Error('Database query timeout - please try again');
      }
      throw new Error('Failed to get fact');
    }
  }

  async getFacts(query: Query): Promise<{ facts: Fact[]; totalCount: number }> {
    try {
      await this.connect(); // Ensure connection
      
      const whereClause: any = {};

      if (query.userId) {
        whereClause.userId = query.userId;
      }

      if (query.subject) {
        whereClause.subject = query.subject;
      }

      if (query.predicate) {
        whereClause.predicate = query.predicate;
      }

      if (query.object) {
        whereClause.object = query.object;
      }

      // Get total count
      const totalCount = await Promise.race([
        this.prisma.fact.count({
          where: whereClause,
        }),
        new Promise<number>((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), 5000)
        )
      ]);

      // Get facts with pagination
      const limit = query.limit || 100;
      const offset = query.offset || 0;

      const facts = await Promise.race([
        this.prisma.fact.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), 5000)
        )
      ]);

      return {
        facts: facts.map((fact: PrismaFact) => this.mapPrismaFactToFact(fact)),
        totalCount,
      };
    } catch (error) {
      console.error('❌ Error getting facts:', error);
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new Error('Database query timeout - please try again');
      }
      throw new Error('Failed to retrieve facts');
    }
  }

  async updateFact(id: string, updates: UpdateFact): Promise<Fact | null> {
    try {
      await this.connect(); // Ensure connection
      
      const updated = await Promise.race([
        this.prisma.fact.update({
          where: { id },
          data: {
            ...(updates.subject && { subject: updates.subject }),
            ...(updates.predicate && { predicate: updates.predicate }),
            ...(updates.object && { object: updates.object }),
          },
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Update timeout')), 5000)
        )
      ]);

      // Invalidate cache for this user
      if (updated) {
        this.cache.invalidateUser(updated.userId);
      }
      
      return this.mapPrismaFactToFact(updated);
    } catch (error) {
      console.error('❌ Error updating fact:', error);
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new Error('Database update timeout - please try again');
      }
      return null;
    }
  }

  async deleteFact(id: string): Promise<boolean> {
    try {
      await this.connect(); // Ensure connection
      
      const deleted = await Promise.race([
        this.prisma.fact.delete({
          where: { id },
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Delete timeout')), 5000)
        )
      ]);

      // Invalidate cache for this user
      if (deleted) {
        this.cache.invalidateUser(deleted.userId);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error deleting fact:', error);
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new Error('Database delete timeout - please try again');
      }
      return false;
    }
  }

  async deleteAllFactsForUser(userId: string): Promise<number> {
    try {
      await this.connect(); // Ensure connection
      const result = await Promise.race([
        this.prisma.fact.deleteMany({
          where: { userId },
        }),
        new Promise<number>((_, reject) => 
          setTimeout(() => reject(new Error('Delete user facts timeout')), 5000)
        )
      ]);
      // Invalidate cache for this user
      this.cache.invalidateUser(userId);
      return result.count;
    } catch (error) {
      console.error('❌ Error deleting user facts:', error);
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new Error('Database delete user facts timeout - please try again');
      }
      throw new Error('Failed to delete user facts');
    }
  }

  async findDuplicateFact(fact: CreateFact): Promise<Fact | null> {
    try {
      await this.connect(); // Ensure connection
      const existing = await Promise.race([
        this.prisma.fact.findFirst({
          where: {
            userId: fact.userId,
            subject: fact.subject,
            predicate: fact.predicate,
            object: fact.object,
          },
        }),
        new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Duplicate fact check timeout')), 3000)
        )
      ]);

      return existing ? this.mapPrismaFactToFact(existing) : null;
    } catch (error) {
      console.error('❌ Error finding duplicate fact:', error);
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new Error('Database duplicate fact check timeout - please try again');
      }
      return null;
    }
  }

  async getUserFactsSummary(userId: string): Promise<{ 
    predicateCount: Record<string, number>; 
    totalFacts: number;
  }> {
    try {
      await this.connect(); // Ensure connection
      const totalFacts = await Promise.race([
        this.prisma.fact.count({
          where: { userId },
        }),
        new Promise<number>((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), 5000)
        )
      ]);

      const predicateGroups = await Promise.race([
        this.prisma.fact.groupBy({
          by: ['predicate'],
          where: { userId },
          _count: {
            predicate: true,
          },
        }),
        new Promise<any[]>((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), 5000)
        )
      ]);

      const predicateCount: Record<string, number> = {};
      predicateGroups.forEach((group: { predicate: string; _count: { predicate: number } }) => {
        predicateCount[group.predicate] = group._count.predicate;
      });

      return { predicateCount, totalFacts };
    } catch (error) {
      console.error('❌ Error getting user facts summary:', error);
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new Error('Database user facts summary timeout - please try again');
      }
      throw new Error('Failed to get facts summary');
    }
  }

  async getFactsByUserId(userId: string, limit: number = 50, offset: number = 0): Promise<Fact[]> {
    try {
      await this.connect(); // Ensure connection
      
      // Check cache first
      const cacheKey = `user:${userId}:limit:${limit}:offset:${offset}`;
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }

      const facts = await Promise.race([
        this.prisma.fact.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), 5000)
        )
      ]);

      const mappedFacts = facts.map(fact => this.mapPrismaFactToFact(fact));
      
      // Cache the result
      this.cache.set(cacheKey, mappedFacts);
      
      return mappedFacts;
    } catch (error) {
      console.error('❌ Error getting facts by user ID:', error);
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new Error('Database query timeout - please try again');
      }
      return []; // Return empty array on error to allow app to continue
    }
  }

  // Clean up old facts (optional utility)
  async cleanupOldFacts(olderThanDays: number = 90): Promise<number> {
    try {
      await this.connect(); // Ensure connection
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await Promise.race([
        this.prisma.fact.deleteMany({
          where: {
            createdAt: {
              lt: cutoffDate,
            },
          },
        }),
        new Promise<number>((_, reject) => 
          setTimeout(() => reject(new Error('Cleanup old facts timeout')), 5000)
        )
      ]);

      return result.count;
    } catch (error) {
      console.error('❌ Error cleaning up old facts:', error);
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new Error('Database cleanup old facts timeout - please try again');
      }
      throw new Error('Failed to cleanup old facts');
    }
  }
} 