import { NextRequest, NextResponse } from 'next/server';
import { getMemoryContext, updateFact, deleteFact } from '@/lib/mcp';
import { z } from 'zod';

const GetFactsSchema = z.object({
  userId: z.string().min(1),
});

const UpdateFactSchema = z.object({
  factId: z.string().min(1),
  subject: z.string().optional(),
  predicate: z.string().optional(),
  object: z.string().optional(),
});

const DeleteFactSchema = z.object({
  factId: z.string().min(1),
});

// GET /api/facts - Retrieve facts for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId parameter is required' },
        { status: 400 }
      );
    }

    const validation = GetFactsSchema.safeParse({ userId });
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: validation.error.issues },
        { status: 400 }
      );
    }

    const memoryContext = await getMemoryContext(userId);
    
    return NextResponse.json({
      success: true,
      facts: memoryContext.facts || [],
      totalCount: memoryContext.facts?.length || 0,
    });

  } catch (error) {
    console.error('Get facts API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/facts - Update a fact
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    const validation = UpdateFactSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { factId, ...updateData } = validation.data;
    const success = await updateFact(factId, updateData);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update fact' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Fact updated successfully',
    });

  } catch (error) {
    console.error('Update fact API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/facts - Delete a fact
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    
    const validation = DeleteFactSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { factId } = validation.data;
    const success = await deleteFact(factId);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete fact' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Fact deleted successfully',
    });

  } catch (error) {
    console.error('Delete fact API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 