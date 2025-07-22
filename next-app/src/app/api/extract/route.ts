import { NextRequest, NextResponse } from 'next/server';
import { extractFacts } from '@/lib/extractFacts';
import { pushFact } from '@/lib/mcp';
import { z } from 'zod';

const ExtractRequestSchema = z.object({
  message: z.string().min(1),
  userId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate the request
    const validation = ExtractRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { message, userId } = validation.data;

    console.log(`Starting fact extraction for user ${userId}`);
    console.log(`Message: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`);

    // Extract facts from the message
    const facts = await extractFacts(message, userId);
    
    console.log(`Extracted ${facts.length} facts`);
    if (facts.length > 0) {
      console.log('Facts extracted:', facts.map(f => `${f.predicate}: ${f.object}`));
    }
    
    if (facts.length === 0) {
      console.log('No extractable facts found in message');
      return NextResponse.json({ 
        message: 'No facts extracted',
        extractedCount: 0 
      });
    }

    // Push facts to MCP server
    console.log(`Pushing ${facts.length} facts to MCP server...`);
    const results = await Promise.allSettled(
      facts.map(fact => pushFact(fact))
    );

    const successCount = results.filter(result => 
      result.status === 'fulfilled' && result.value === true
    ).length;

    const failureCount = results.length - successCount;

    if (failureCount > 0) {
      console.warn(`Failed to push ${failureCount} out of ${results.length} facts to MCP server`);
    } else {
      console.log(`Successfully saved ${successCount} facts to memory`);
    }

    return NextResponse.json({
      message: 'Facts extraction completed',
      extractedCount: facts.length,
      savedCount: successCount,
      failedCount: failureCount,
      facts: facts.map(fact => ({
        subject: fact.subject,
        predicate: fact.predicate,
        object: fact.object,
      })),
    });

  } catch (error) {
    console.error('❌ Extract API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 