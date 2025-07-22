import { NextRequest, NextResponse } from 'next/server';
import { createChatModel, formatMessagesForLangChain } from '@/lib/langchain';
import { saveMessage, getMessages } from '@/lib/redis';
import { getMemoryContext } from '@/lib/mcp';
import { CreateMessageSchema, Message } from '@/types/message';
import { MemoryContext } from '@/types/fact';

// Helper function to handle MCP calls with fallback
async function getMemoryContextSafe(userId: string): Promise<MemoryContext> {
  try {
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
    
    const memoryContextPromise = getMemoryContext(userId);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Memory context timeout')), 7000);
    });
    
    const memoryContext = await Promise.race([memoryContextPromise, timeoutPromise]);
    clearTimeout(timeoutId);
    
    console.log(`✅ Retrieved ${memoryContext.facts?.length || 0} facts from memory`);
    return memoryContext;
  } catch (error) {
    console.warn(`⚠️ Memory context retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    // Return empty context on error to allow chat to continue
    return { userId, facts: [] };
  }
}

// Helper function for background fact extraction with error handling
async function triggerFactExtraction(content: string, userId: string, origin: string): Promise<void> {
  try {
    console.log(`🔄 Triggering fact extraction for message: "${content.substring(0, 50)}..."`);
    
    // Add timeout for background requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    await fetch(`${origin}/api/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: content, userId }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
  } catch (error) {
    console.error('❌ Background fact extraction failed:', error instanceof Error ? error.message : 'Unknown error');
    // Don't throw - this is a background operation
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate the request
    const validation = CreateMessageSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { userId, content, role } = validation.data;

    // Save user message to Redis with error handling
    try {
      await saveMessage(userId, { userId, content, role });
    } catch (error) {
      console.error('❌ Failed to save message to Redis:', error);
      // Continue with chat even if Redis fails
    }

    // Get conversation history with fallback
    let conversationHistory: Message[];
    try {
      conversationHistory = await getMessages(userId, 20);
    } catch (error) {
      console.error('❌ Failed to get conversation history:', error);
      // Use empty history as fallback
      conversationHistory = [];
    }

    // Get memory context from MCP with safe fallback
    console.log(`📥 Fetching memory context for user: ${userId}`);
    const memoryContext = await getMemoryContextSafe(userId);
    
    if (memoryContext.facts && memoryContext.facts.length > 0) {
      console.log('💭 Facts available:', memoryContext.facts.map(f => `${f.predicate}: ${f.object}`));
    }

    // Format messages for LangChain
    const model = createChatModel();
    const formattedMessages = formatMessagesForLangChain(conversationHistory, memoryContext);

    // Trigger background fact extraction for user messages (fire and forget)
    if (role === 'user') {
      // Don't await this - run in background
      triggerFactExtraction(content, userId, request.nextUrl.origin).catch(() => {
        // Error already logged in function
      });
    }

    // Stream the response with timeout handling
    let stream;
    try {
      // Add timeout to model.stream
      const streamPromise = model.stream(formattedMessages);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('AI model timeout')), 30000); // 30 second timeout
      });
      
      stream = await Promise.race([streamPromise, timeoutPromise]);
    } catch (error) {
      console.error('❌ AI model streaming failed:', error);
      
      // Return error response in streaming format
      const errorMessage = 'Sorry, I encountered an error. Please try again.';
      const encoder = new TextEncoder();
      
      const errorStream = new ReadableStream({
        start(controller) {
          const data = JSON.stringify({ content: errorMessage, done: true });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          controller.close();
        },
      });

      return new Response(errorStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }
    
    let fullResponse = '';
    const encoder = new TextEncoder();
    
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.content;
            if (content) {
              fullResponse += content;
              const data = JSON.stringify({ content, done: false });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }
          
          // Save assistant's response to Redis (with error handling)
          try {
            await saveMessage(userId, {
              userId,
              content: fullResponse,
              role: 'assistant',
            });
            console.log(`✅ Assistant response saved. Length: ${fullResponse.length} chars`);
          } catch (error) {
            console.error('❌ Failed to save assistant response:', error);
            // Continue even if save fails
          }
          
          // Send completion signal
          const doneData = JSON.stringify({ content: '', done: true });
          controller.enqueue(encoder.encode(`data: ${doneData}\n\n`));
          controller.close();
        } catch (error) {
          console.error('❌ Streaming error:', error);
          
          // Send error message if streaming fails
          try {
            const errorData = JSON.stringify({ 
              content: '\n\nSorry, there was an error processing your request.', 
              done: true 
            });
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          } catch (e) {
            console.error('❌ Failed to send error message:', e);
          }
          
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('❌ Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
}

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

    // Add timeout for getting messages
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Get messages timeout')), 5000);
    });
    
    const messagesPromise = getMessages(userId, 50);
    const messages = await Promise.race([messagesPromise, timeoutPromise]);
    
    return NextResponse.json({ messages });

  } catch (error) {
    console.error('❌ Get messages error:', error);
    
    if (error instanceof Error && error.message.includes('timeout')) {
      return NextResponse.json(
        { error: 'Request timeout. Please try again.' },
        { status: 408 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 