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

export class FactDatabase {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });
  }

  async connect() {
    try {
      await this.prisma.$connect();
      console.log('Connected to SQLite database');
    } catch (error) {
      console.error('Unable to connect to the database:', error);
      throw error; 
    }
  }

  async disconnect() {
    await this.prisma.$disconnect();
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
      // Check for duplicate first
      const existing = await this.findDuplicateFact(fact);
      if (existing) {
        return existing;
      }

      const created = await this.prisma.fact.create({
        data: {
          subject: fact.subject,
          predicate: fact.predicate,
          object: fact.object,
          userId: fact.userId,
          timestamp: fact.timestamp ? new Date(fact.timestamp) : new Date(),
        },
      });

      return this.mapPrismaFactToFact(created);
    } catch (error) {
      console.error('Error creating fact:', error);
      throw new Error('Failed to create fact');
    }
  }

  async getFactById(id: string): Promise<Fact | null> {
    try {
      const fact = await this.prisma.fact.findUnique({
        where: { id },
      });

      return fact ? this.mapPrismaFactToFact(fact) : null;
    } catch (error) {
      console.error('Error getting fact by ID:', error);
      throw new Error('Failed to retrieve fact');
    }
  }

  async getFacts(query: Query): Promise<{ facts: Fact[]; totalCount: number }> {
    try {
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
      const totalCount = await this.prisma.fact.count({
        where: whereClause,
      });

      // Get facts with pagination
      const limit = query.limit || 100;
      const offset = query.offset || 0;

      const facts = await this.prisma.fact.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      return {
        facts: facts.map((fact: PrismaFact) => this.mapPrismaFactToFact(fact)),
        totalCount,
      };
    } catch (error) {
      console.error('Error getting facts:', error);
      throw new Error('Failed to retrieve facts');
    }
  }

  async updateFact(id: string, updates: UpdateFact): Promise<Fact | null> {
    try {
      const updateData: any = {};

      if (updates.subject !== undefined) {
        updateData.subject = updates.subject;
      }

      if (updates.predicate !== undefined) {
        updateData.predicate = updates.predicate;
      }

      if (updates.object !== undefined) {
        updateData.object = updates.object;
      }

      if (updates.userId !== undefined) {
        updateData.userId = updates.userId;
      }

      if (Object.keys(updateData).length === 0) {
        return await this.getFactById(id);
      }

      const updated = await this.prisma.fact.update({
        where: { id },
        data: updateData,
      });

      return this.mapPrismaFactToFact(updated);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Record to update not found')) {
        return null;
      }
      console.error('Error updating fact:', error);
      throw new Error('Failed to update fact');
    }
  }

  async deleteFact(id: string): Promise<boolean> {
    try {
      await this.prisma.fact.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
        return false;
      }
      console.error('Error deleting fact:', error);
      throw new Error('Failed to delete fact');
    }
  }

  async deleteAllFactsForUser(userId: string): Promise<number> {
    try {
      const result = await this.prisma.fact.deleteMany({
        where: { userId },
      });
      return result.count;
    } catch (error) {
      console.error('Error deleting user facts:', error);
      throw new Error('Failed to delete user facts');
    }
  }

  async findDuplicateFact(fact: CreateFact): Promise<Fact | null> {
    try {
      const existing = await this.prisma.fact.findFirst({
        where: {
          userId: fact.userId,
          subject: fact.subject,
          predicate: fact.predicate,
          object: fact.object,
        },
      });

      return existing ? this.mapPrismaFactToFact(existing) : null;
    } catch (error) {
      console.error('Error finding duplicate fact:', error);
      return null;
    }
  }

  async getUserFactsSummary(userId: string): Promise<{ 
    predicateCount: Record<string, number>; 
    totalFacts: number;
  }> {
    try {
      const totalFacts = await this.prisma.fact.count({
        where: { userId },
      });

      const predicateGroups = await this.prisma.fact.groupBy({
        by: ['predicate'],
        where: { userId },
        _count: {
          predicate: true,
        },
      });

      const predicateCount: Record<string, number> = {};
      predicateGroups.forEach((group: { predicate: string; _count: { predicate: number } }) => {
        predicateCount[group.predicate] = group._count.predicate;
      });

      return { predicateCount, totalFacts };
    } catch (error) {
      console.error('Error getting user facts summary:', error);
      throw new Error('Failed to get facts summary');
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  // Clean up old facts (optional utility)
  async cleanupOldFacts(olderThanDays: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await this.prisma.fact.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      return result.count;
    } catch (error) {
      console.error('Error cleaning up old facts:', error);
      throw new Error('Failed to cleanup old facts');
    }
  }
} 