# MemoryMind - AI Chat with Persistent Memory (MCP Implementation)

AI chat application that combines Next.js, Gemini 2.5 Flash, and **MCP (Model Context Protocol)** to create memory-aware conversations. The AI remembers facts about users across sessions and provides personalized responses using proper MCP protocol implementation.

## 🚀 Features

### ✨ Core Features
- **MCP Implementation**: Uses official @modelcontextprotocol/sdk for MCP compliance
- **Memory-Aware Conversations**: AI remembers facts about users across sessions via MCP tools and resources
- **Real-time Streaming**: Token-by-token response streaming
- **Fact Management**: View, edit, and delete stored facts about yourself via MCP tools
- **Persistent Storage**: Facts stored in PostgreSQL via MCP server tools
- **Background Processing**: Automatic fact extraction without blocking conversations

### 🧠 MCP Memory System
- **MCP Tools**: create-fact, get-facts, update-fact, delete-fact for memory management
- **MCP Resources**: memory://context/{userId} and memory://summary/{userId} for structured access
- **Structured Knowledge Graph**: Facts stored as subject-predicate-object triples
- **Context Integration**: Memory facts retrieved via MCP and injected into AI system prompts
- **Real-time Updates**: Facts updated automatically using MCP tools after each conversation

### 🎨 User Experience
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Smooth Animations**: Framer Motion animations throughout the interface
- **Memory Sidebar**: Toggle-able sidebar to view and manage facts
- **Loading States**: Beautiful loading indicators and streaming animations
- **Error Handling**: Graceful error handling with user feedback

## 🏗️ MCP Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App   │────│   MCP Server    │────│   PostgreSQL    │
│                 │    │                 │    │                 │
│ • Chat UI       │    │ • MCP Tools     │    │ • Facts DB      │
│ • MCP Client    │    │ • MCP Resources │    │ • Persistence   │
│ • Streaming     │    │ • HTTP Transport│    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│   Gemini API    │    │   Redis Cache   │
│                 │    │                 │
│ • AI Responses  │    │ • Message Store │
│ • Fact Extract  │    │ • Session Data  │
└─────────────────┘    └─────────────────┘
```

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Framer Motion
- **AI**: Google Gemini 2.5 Flash via LangChain
- **Memory**: **Real MCP Server** with PostgreSQL (using @modelcontextprotocol/sdk)
- **MCP Client**: **Official MCP TypeScript SDK** with StreamableHTTP transport
- **Cache**: Redis for message storage
- **UI Components**: Lucide React icons
- **Animation**: Framer Motion

## 📦 Project Structure

```
memory-mind/
├── next-app/                  # Next.js frontend application
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/
│   │   │   │   ├── chat/      # Chat API endpoint (streams via MCP)
│   │   │   │   ├── extract/   # Fact extraction endpoint (uses MCP tools)
│   │   │   │   └── facts/     # Fact management API (MCP proxy)
│   │   │   ├── chat/          # Chat page UI
│   │   │   └── page.tsx       # Landing page
│   │   ├── components/
│   │   │   ├── ChatWindow.tsx # Main chat interface
│   │   │   ├── ChatInput.tsx  # Message input component
│   │   │   ├── Message.tsx    # Individual message display
│   │   │   └── FactsSidebar.tsx # Facts management sidebar
│   │   ├── lib/
│   │   │   ├── langchain.ts   # AI model setup
│   │   │   ├── mcp.ts         # MCP Client (real MCP SDK)
│   │   │   ├── redis.ts       # Redis client
│   │   │   └── extractFacts.ts # Fact extraction logic
│   │   ├── types/
│   │   │   ├── message.ts     # Message types
│   │   │   └── fact.ts        # Fact types
│   │   └── utils/
│   │       ├── formatPrompt.ts # Prompt formatting
│   │       └── memoryContext.ts # Memory utilities
│   └── package.json
└── mcp-server/                # Real MCP memory server
    ├── src/
    │   ├── database.ts        # Database operations
    │   ├── routes.ts          # Legacy (removed)
    │   └── types.ts           # Type definitions
    ├── prisma/
    │   └── schema.prisma      # Database schema
    ├── index.ts               # MCP Server implementation
    └── package.json
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ or Bun
- PostgreSQL database
- Redis instance
- Google Gemini API key

### 1. Clone and Install
```bash
git clone https://github.com/sincerelyyyash/memory-mind
cd memory-mind

# Install dependencies
cd next-app && bun install
cd ../mcp-server && bun install
```

### 2. Environment Setup

**Next.js App (.env.local)**:
```env
GEMINI_API_KEY=your_gemini_api_key_here
UPSTASH_REDIS_REST_URL=your_redis_url_here
UPSTASH_REDIS_REST_TOKEN=your_redis_token_here
MCP_SERVER_URL=http://localhost:3001/mcp
NODE_ENV=development
```

**MCP Server (.env)**:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/memory_db"
PORT=3001
NODE_ENV=development
```

### 3. Database Setup
```bash
cd mcp-server
bunx prisma migrate dev
bunx prisma generate
```

### 4. Start MCP Server
```bash
# Terminal 1: Start MCP Server with HTTP transport
cd mcp-server
bun run start:http

# Or for development with hot reload:
bun run dev:http
```

### 5. Start Next.js App
```bash
# Terminal 2: Start Next.js App
cd next-app
bun run dev
```

### 6. Access Application
Open [http://localhost:3000](http://localhost:3000) to start chatting!

## 🧠 MCP Implementation Details

### MCP Tools (Memory Operations)

The MCP server exposes the following tools for memory management:

1. **create-fact**: Creates new facts in memory
   ```json
   {
     "name": "create-fact",
     "arguments": {
       "subject": "user",
       "predicate": "favorite_team",
       "object": "Golden State Warriors", 
       "userId": "user123"
     }
   }
   ```

2. **get-facts**: Retrieves facts for a user
   ```json
   {
     "name": "get-facts",
     "arguments": {
       "userId": "user123",
       "subject": "user",
       "predicate": "favorite_team"
     }
   }
   ```

3. **update-fact**: Updates existing facts
4. **delete-fact**: Deletes facts from memory

### MCP Resources (Memory Access)

1. **memory://context/{userId}**: Complete memory context as JSON
2. **memory://summary/{userId}**: Facts summary by predicate

### Memory Integration Process

1. **Message Received** → Chat API processes user message
2. **MCP Resource Access** → Gets existing facts via `memory://context/{userId}` resource
3. **Context Injection** → Adds facts to system prompt
4. **AI Response** → Gemini generates contextual response
5. **Background Extraction** → Extracts new facts from user message
6. **MCP Tool Call** → Saves new facts using `create-fact` tool
7. **Future Context** → New facts available for next conversation via MCP

## 🔧 MCP API Endpoints

### MCP Server (MCP Protocol)
- **POST** `/mcp`: MCP protocol endpoint (StreamableHTTP transport)
- **GET** `/health`: Health check

### Chat API (`/api/chat`)
- **POST**: Send message and get streaming response (uses MCP client)
- **GET**: Retrieve conversation history

### Facts API (`/api/facts`)
- **GET**: Retrieve user facts (via MCP tools)
- **PUT**: Update existing fact (via MCP tools)
- **DELETE**: Remove fact (via MCP tools)

### Extract API (`/api/extract`)
- **POST**: Extract facts from message (background, uses MCP tools)

## 🎨 UI Features

- **Dark Theme**: Elegant gray color scheme
- **Smooth Animations**: Framer Motion throughout
- **Responsive Layout**: Works on all screen sizes
- **Avatar System**: User and AI avatars
- **Streaming Indicators**: Real-time typing animations

### Memory Management
- **Facts Sidebar**: Toggle-able memory view
- **Inline Editing**: Edit facts directly in sidebar
- **Real-time Updates**: Facts update automatically via MCP
- **Visual Feedback**: Loading states and confirmations

### Interactive Elements
- **Auto-resizing Input**: Text area grows with content
- **Keyboard Shortcuts**: Enter to send, Shift+Enter for new line
- **Hover Effects**: Subtle UI feedback
- **Focus States**: Clear interaction indicators

## 🔒 Security & Best Practices

- **MCP Protocol Compliance**: Uses official MCP SDK with proper protocol implementation
- **API Key Protection**: Environment variables never exposed client-side
- **Input Validation**: Zod schemas for all API inputs and MCP tool arguments
- **Error Handling**: Graceful fallbacks for all operations including MCP failures
- **Memory Isolation**: Facts isolated by user ID in MCP tools
- **Data Sanitization**: All inputs sanitized before MCP tool calls

### Transport Security
- **StreamableHTTP**: Modern MCP transport with session management
- **CORS Configuration**: Proper CORS headers for cross-origin MCP access
- **Session Isolation**: Each user gets isolated MCP session

## 🧪 Testing MCP Integration

### Test MCP Server Health
```bash
curl http://localhost:3001/health
```

### Test MCP Inspector (Optional)
```bash
# Install MCP Inspector globally
npm install -g @modelcontextprotocol/inspector

# Inspect the MCP server
npx @modelcontextprotocol/inspector http://localhost:3001/mcp
```

### Verify MCP Tools
The MCP server exposes tools that can be tested via MCP clients or the inspector.

## 📝 MCP Protocol Compliance

This implementation uses the **official MCP TypeScript SDK** and follows MCP protocol specifications:

- ✅ **StreamableHTTP Transport**: Modern HTTP-based MCP transport
- ✅ **MCP Tools**: Proper tool registration and execution
- ✅ **MCP Resources**: Resource templates with URI patterns
- ✅ **JSON-RPC 2.0**: MCP protocol compliance
- ✅ **Session Management**: Proper MCP session handling
- ✅ **Error Handling**: MCP-compliant error responses

## 🚀 Production Deployment

### Environment Variables
Ensure all environment variables are configured in your deployment platform:

**Next.js App**:
- `GEMINI_API_KEY`
- `UPSTASH_REDIS_REST_URL` 
- `UPSTASH_REDIS_REST_TOKEN`
- `MCP_SERVER_URL`

**MCP Server**:
- `DATABASE_URL`
- `PORT`

### Docker Support
Both applications can be containerized and deployed with Docker.

### MCP Server Scaling
The MCP server supports horizontal scaling with shared PostgreSQL database.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🔍 Key Differences from REST Implementation

This implementation replaces the previous REST API mimic with **actual MCP protocol**:

1. **MCP Server**: Uses `@modelcontextprotocol/sdk` with proper MCP tools and resources
2. **MCP Client**: Next.js app uses official MCP client with StreamableHTTP transport
3. **Protocol Compliance**: Full JSON-RPC 2.0 MCP protocol implementation
4. **Tool-based Operations**: Memory operations via MCP tools instead of REST endpoints
5. **Resource Access**: Memory context via MCP resources with URI patterns
6. **Session Management**: Proper MCP session handling with transport cleanup
7. **Production Ready**: Scalable, standards-compliant MCP implementation

The chat interface and user experience remain identical, but the underlying memory system now uses genuine MCP protocol for enterprise-grade reliability and interoperability.


