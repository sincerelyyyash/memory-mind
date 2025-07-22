# AI Chat with Memory - Townsquare Assignment

A sophisticated AI chat application that combines Next.js, Gemini 2.5 Flash, and MCP (Model Context Protocol) to create memory-aware conversations. The AI remembers facts about users across sessions and provides personalized responses.

## 🚀 Features

### ✨ Core Features
- **Memory-Aware Conversations**: AI remembers facts about users across sessions
- **Real-time Streaming**: Token-by-token response streaming
- **Silver Aesthetic UI**: Beautiful dark theme with smooth animations
- **Fact Management**: View, edit, and delete stored facts about yourself
- **Persistent Storage**: Facts stored in PostgreSQL via MCP server
- **Background Processing**: Automatic fact extraction without blocking conversations

### 🧠 Memory System
- **Automatic Fact Extraction**: AI extracts facts from conversations using Gemini
- **Structured Knowledge Graph**: Facts stored as subject-predicate-object triples
- **Context Integration**: Memory facts injected into AI system prompts
- **Real-time Updates**: Facts updated automatically after each conversation

### 🎨 User Experience
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Smooth Animations**: Framer Motion animations throughout the interface
- **Memory Sidebar**: Toggle-able sidebar to view and manage facts
- **Loading States**: Beautiful loading indicators and streaming animations
- **Error Handling**: Graceful error handling with user feedback

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App   │────│   MCP Server    │────│   PostgreSQL    │
│                 │    │                 │    │                 │
│ • Chat UI       │    │ • Fact Storage  │    │ • Facts DB      │
│ • API Routes    │    │ • CRUD Ops      │    │ • Persistence   │
│ • Streaming     │    │ • Memory API    │    │                 │
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
- **Memory**: MCP Server with PostgreSQL
- **Cache**: Redis for message storage
- **UI Components**: Lucide React icons
- **Animation**: Framer Motion

## 📦 Project Structure

```
townsquare-assignment/
├── next-app/                  # Next.js frontend application
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/
│   │   │   │   ├── chat/      # Chat API endpoint
│   │   │   │   ├── extract/   # Fact extraction endpoint
│   │   │   │   └── facts/     # Fact management API
│   │   │   ├── chat/          # Chat page UI
│   │   │   └── page.tsx       # Landing page
│   │   ├── components/
│   │   │   ├── ChatWindow.tsx # Main chat interface
│   │   │   ├── ChatInput.tsx  # Message input component
│   │   │   ├── Message.tsx    # Individual message display
│   │   │   └── FactsSidebar.tsx # Facts management sidebar
│   │   ├── lib/
│   │   │   ├── langchain.ts   # AI model setup
│   │   │   ├── mcp.ts         # MCP client
│   │   │   ├── redis.ts       # Redis client
│   │   │   └── extractFacts.ts # Fact extraction logic
│   │   ├── types/
│   │   │   ├── message.ts     # Message types
│   │   │   └── fact.ts        # Fact types
│   │   └── utils/
│   │       ├── formatPrompt.ts # Prompt formatting
│   │       └── memoryContext.ts # Memory utilities
│   └── package.json
└── mcp-server/                # MCP memory server
    ├── src/
    │   ├── database.ts        # Database operations
    │   ├── routes.ts          # REST API routes
    │   └── types.ts           # Type definitions
    ├── prisma/
    │   └── schema.prisma      # Database schema
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
git clone https://github.com/sincerelyyyash/townsquare-assignment
cd townsquare-assignment

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
MCP_SERVER_URL=http://localhost:3001
NODE_ENV=development
```

**MCP Server (.env)**:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/memory_db"
PORT=3001
```

### 3. Database Setup
```bash
cd mcp-server
bunx prisma migrate dev
bunx prisma generate
```

### 4. Start Services
```bash
# Terminal 1: Start MCP Server
cd mcp-server
bun run dev

# Terminal 2: Start Next.js App
cd next-app
bun run dev
```

### 5. Access Application
Open [http://localhost:3000](http://localhost:3000) to start chatting!

## 🧠 Memory Flow Example

### Example Conversation Flow

1. **User**: "My favorite team is the Golden State Warriors."
2. **AI Response**: "They're a great team! Who's your favorite player?"
3. **Background**: System extracts `{ subject: "user", predicate: "favorite_team", object: "Golden State Warriors" }` and stores it in memory.
4. **Later User**: "Who's my favorite team?"
5. **AI Response**: "Your favorite team is the Golden State Warriors!"

### Memory Integration Process

1. **Message Received** → Chat API processes user message
2. **Memory Retrieval** → Gets existing facts from MCP server
3. **Context Injection** → Adds facts to system prompt
4. **AI Response** → Gemini generates contextual response
5. **Background Extraction** → Extracts new facts from user message
6. **Memory Update** → Saves new facts to MCP server
7. **Future Context** → New facts available for next conversation

## 🔧 API Endpoints

### Chat API (`/api/chat`)
- **POST**: Send message and get streaming response
- **GET**: Retrieve conversation history

### Facts API (`/api/facts`)
- **GET**: Retrieve user facts
- **PUT**: Update existing fact
- **DELETE**: Remove fact

### Extract API (`/api/extract`)
- **POST**: Extract facts from message (background)

### MCP Server Endpoints
- **POST** `/context`: Create fact
- **GET** `/context`: Retrieve facts
- **PUT** `/context/:id`: Update fact
- **DELETE** `/context/:id`: Delete fact

## 🎨 UI Features


- **Dark Theme**: Elegant gray color scheme
- **Smooth Animations**: Framer Motion throughout
- **Responsive Layout**: Works on all screen sizes
- **Avatar System**: User and AI avatars
- **Streaming Indicators**: Real-time typing animations

### Memory Management
- **Facts Sidebar**: Toggle-able memory view
- **Inline Editing**: Edit facts directly in sidebar
- **Real-time Updates**: Facts update automatically
- **Visual Feedback**: Loading states and confirmations

### Interactive Elements
- **Auto-resizing Input**: Text area grows with content
- **Keyboard Shortcuts**: Enter to send, Shift+Enter for new line
- **Hover Effects**: Subtle UI feedback
- **Focus States**: Clear interaction indicators

## 🔒 Security & Best Practices

- **API Key Protection**: Environment variables never exposed client-side
- **Input Validation**: Zod schemas for all API inputs
- **Error Handling**: Graceful fallbacks for all operations
- **Rate Limiting**: Built-in protection against abuse
- **Memory Isolation**: Facts isolated by user ID
- **Data Sanitization**: All inputs sanitized before processing

### Environment Variables
Ensure all environment variables are configured in your deployment platform.


### Debug Mode
Set `NODE_ENV=development` to see detailed logging of memory operations.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.


