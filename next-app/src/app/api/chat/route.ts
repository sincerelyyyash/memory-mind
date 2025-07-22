import { NextRequest, NextResponse } from 'next/server';
import { createChatModel, formatMessagesForLangChain } from '@/lib/langchain';
import { saveMessage, getMessages } from '@/lib/redis';
import { getMemoryContext } from '@/lib/mcp';
import { CreateMessageSchema } from '@/types/message';

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

    // Save user message to Redis
    await saveMessage(userId, { userId, content, role });

    // Get conversation history
    const conversationHistory = await getMessages(userId, 20);

    // Get memory context from MCP with debugging
    console.log(`Fetching memory context for user: ${userId}`);
    const memoryContext = await getMemoryContext(userId);
    console.log(`Retrieved ${memoryContext.facts?.length || 0} facts from memory`);
    
    if (memoryContext.facts && memoryContext.facts.length > 0) {
      console.log('Facts available:', memoryContext.facts.map(f => `${f.predicate}: ${f.object}`));
    }

    // Format messages for LangChain
    const model = createChatModel();
    const formattedMessages = formatMessagesForLangChain(conversationHistory, memoryContext);

    // Trigger background fact extraction for user messages
    if (role === 'user') {
      console.log(`Triggering fact extraction for message: "${content.substring(0, 50)}..."`);
      // Fire and forget - extract facts in background
      fetch(`${request.nextUrl.origin}/api/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: content, userId }),
      }).catch(error => {
        console.error('❌ Background fact extraction failed:', error);
      });
    }

    // Stream the response
    const stream = await model.stream(formattedMessages);
    
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
          
          // Save assistant's response to Redis
          await saveMessage(userId, {
            userId,
            content: fullResponse,
            role: 'assistant',
          });
          
          console.log(`Assistant response saved. Length: ${fullResponse.length} chars`);
          
          // Send completion signal
          const doneData = JSON.stringify({ content: '', done: true });
          controller.enqueue(encoder.encode(`data: ${doneData}\n\n`));
          controller.close();
        } catch (error) {
          console.error('❌ Streaming error:', error);
          controller.error(error);
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
      { error: 'Internal server error' },
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

    const messages = await getMessages(userId, 50);
    return NextResponse.json({ messages });

  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 