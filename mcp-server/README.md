# MCP Server - Model Context Protocol

A robust Express.js server that implements the Model Context Protocol (MCP) for AI chat memory management. This server stores and retrieves user facts extracted from conversations, enabling AI assistants to maintain context across sessions.

## 🚀 Features

- **SQLite Database**: Lightweight, file-based data persistence with Prisma ORM
- **RESTful API**: Full CRUD operations for fact management
- **TypeScript**: Complete type safety and excellent developer experience
- **CORS Support**: Configurable cross-origin resource sharing
- **Input Validation**: Zod schemas for request validation
- **Health Monitoring**: Built-in health check endpoints
- **Graceful Shutdown**: Proper cleanup on server termination
- **Error Handling**: Comprehensive error handling and logging

## 📋 Prerequisites

- **Bun** (recommended) or Node.js 18+
- **No external database required** - uses SQLite file-based storage

## 🛠️ Quick Start

### 1. Installation

```bash
cd mcp-server
bun install
```

### 2. Database Setup

Set up your environment variables:

```bash
cp .env.example .env
# The default SQLite configuration should work out of the box
```

Example `.env`:
```env
DATABASE_URL="file:dev.db"
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### 3. Database Migration

```bash
# Generate Prisma client
bunx prisma generate

# Initialize database with migrations
bunx prisma migrate dev --name init

# Optional: View your database
bunx prisma studio
```

### 4. Start the Server

```bash
# Development mode (with hot reload)
bun run dev

# Production mode
bun start
```

The server will be available at `http://localhost:3001`

## 📡 API Endpoints

### Base URL: `http://localhost:3001`

### Health Check
- **GET** `/health` - Server and database health status

### Fact Management

#### Create Fact
- **POST** `/context`
- **Body**: 
  ```json
  {
    "subject": "user",
    "predicate": "lives_in",
    "object": "New York",
    "userId": "user_123",
    "timestamp": "2024-01-01T00:00:00.000Z" // optional
  }
  ```
- **Response**: 
  ```json
  {
    "success": true,
    "fact": {
      "id": "clx1234567890",
      "subject": "user",
      "predicate": "lives_in",
      "object": "New York",
      "userId": "user_123",
      "timestamp": "2024-01-01T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

#### Get Facts (Memory Context)
- **GET** `/context?userId=user_123`
- **Query Parameters**:
  - `userId` (required for memory context)
  - `subject`, `predicate`, `object` (optional filters)
  - `limit` (default: 100, max: 1000)
  - `offset` (default: 0)
- **Response**: 
  ```json
  {
    "userId": "user_123",
    "facts": [...],
    "totalCount": 42
  }
  ```

#### Get Fact by ID
- **GET** `/context/:id`
- **Response**: 
  ```json
  {
    "success": true,
    "fact": { ... }
  }
  ```

#### Update Fact
- **PUT** `/context/:id`
- **Body**: 
  ```json
  {
    "subject": "user",
    "predicate": "works_as",
    "object": "Software Engineer"
  }
  ```

#### Delete Fact
- **DELETE** `/context/:id`
- **Response**: 
  ```json
  {
    "success": true,
    "message": "Fact deleted successfully"
  }
  ```

#### Delete All User Facts
- **DELETE** `/context/user/:userId`
- **Response**: 
  ```json
  {
    "success": true,
    "deletedCount": 15,
    "message": "Deleted 15 facts for user user_123"
  }
  ```

#### Get User Facts Summary
- **GET** `/context/user/:userId/summary`
- **Response**: 
  ```json
  {
    "success": true,
    "userId": "user_123",
    "summary": {
      "predicateCount": {
        "lives_in": 1,
        "works_as": 1,
        "likes": 3
      },
      "totalFacts": 5
    }
  }
  ```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | SQLite database file path | file:dev.db | ✅ |
| `PORT` | Server port | 3001 | ❌ |
| `NODE_ENV` | Environment (development/production) | development | ❌ |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | http://localhost:3000 | ❌ |

### Database Configuration

The server uses SQLite with Prisma ORM. The database schema includes:

```sql
-- Facts table
CREATE TABLE facts (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  predicate TEXT NOT NULL,
  object TEXT NOT NULL,
  userId TEXT NOT NULL,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_facts_userId ON facts(userId);
CREATE INDEX idx_facts_subject ON facts(subject);
CREATE INDEX idx_facts_predicate ON facts(predicate);
CREATE INDEX idx_facts_composite ON facts(userId, subject, predicate);
CREATE UNIQUE INDEX idx_facts_unique ON facts(userId, subject, predicate, object);
```

## 🧪 Testing

### Manual Testing

```bash
# Health check
curl http://localhost:3001/health

# Create a fact
curl -X POST http://localhost:3001/context \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "user",
    "predicate": "lives_in",
    "object": "San Francisco",
    "userId": "test_user"
  }'

# Get user facts
curl "http://localhost:3001/context?userId=test_user"
```

### Using with Next.js App

The MCP server is designed to work with the Next.js chat application. Make sure:

1. MCP server is running on port 3001
2. Next.js app has `MCP_SERVER_URL=http://localhost:3001` in `.env.local`
3. CORS is configured to allow your Next.js app origin

## 🚀 Deployment

### Local Deployment

```bash
# Build for production
bun run build

# Start production server
bun start
```

### Cloud Deployment

#### Railway
1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Deploy automatically on push

#### Render
1. Create a new Web Service on Render
2. Connect your repository
3. Set build command: `bun install && bunx prisma generate && bunx prisma migrate deploy`
4. Set start command: `bun start`
5. Add environment variables

#### Vercel
1. Deploy to Vercel
2. Set environment variables (DATABASE_URL will point to a SQLite file)
3. Run migrations: `bunx prisma migrate deploy`
4. Note: SQLite files will be stored in the deployment filesystem

### Environment Variables for Production

```env
DATABASE_URL="file:prod.db"
PORT=3001
NODE_ENV=production
ALLOWED_ORIGINS=https://your-nextjs-app.vercel.app,https://your-domain.com
```

## 🔒 Security Considerations

### Authentication (Optional)

Add API key authentication by setting `API_KEY` environment variable:

```env
API_KEY=your_secure_api_key_here
```

Then add this middleware to your routes:

```typescript
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization'];
  
  if (process.env.API_KEY && apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
};
```

### Production Security Checklist

- [ ] Use HTTPS in production
- [ ] Set up proper CORS origins
- [ ] Enable API key authentication
- [ ] Use connection pooling for database
- [ ] Set up rate limiting
- [ ] Enable request logging
- [ ] Use environment variables for secrets
- [ ] Regular security updates

## 🛡️ Error Handling

The server includes comprehensive error handling:

- **400 Bad Request**: Invalid input data
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server errors
- **503 Service Unavailable**: Database connection issues

All errors return JSON responses with descriptive messages.

## 📊 Monitoring

### Health Check Response

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected"
}
```

### Logging

The server logs:
- All HTTP requests with timestamps
- Database connection status
- Error details (in development)
- Startup and shutdown events

## 🔧 Development

### Project Structure

```
mcp-server/
├── src/
│   ├── types.ts          # TypeScript type definitions
│   ├── database.ts       # Database operations
│   └── routes.ts         # API route handlers
├── prisma/
│   └── schema.prisma     # Database schema
├── index.ts              # Main server file
├── package.json          # Dependencies and scripts
├── .env.example          # Environment variables template
└── README.md             # This file
```

### Adding New Features

1. Update types in `src/types.ts`
2. Add database methods in `src/database.ts`
3. Create routes in `src/routes.ts`
4. Update database schema if needed
5. Run migrations: `bunx prisma migrate dev`

## 🤝 Integration with Next.js App

The MCP server is specifically designed to work with the AI chat Next.js application:

1. **Fact Creation**: Next.js app calls `POST /context` to store extracted facts
2. **Memory Retrieval**: Next.js app calls `GET /context?userId=xyz` to get user context
3. **Real-time Updates**: Facts are stored immediately and available for next requests

### Example Integration Code

```typescript
// In your Next.js app
const pushFact = async (fact: CreateFact): Promise<boolean> => {
  const response = await fetch(`${MCP_SERVER_URL}/context`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fact),
  });
  return response.ok;
};

const getMemoryContext = async (userId: string): Promise<MemoryContext> => {
  const response = await fetch(`${MCP_SERVER_URL}/context?userId=${userId}`);
  return await response.json();
};
```

## 📝 License

This project is part of the Townsquare assignment and is for educational purposes.

## 🆘 Troubleshooting

### Common Issues

**Database Connection Error**
```
❌ Failed to connect to database
```
- Check your `DATABASE_URL` is correct (should start with `file:`)
- Ensure the directory for the SQLite file exists and is writable
- Run `bunx prisma migrate dev` to initialize the database

**CORS Error**
```
Origin not allowed by CORS
```
- Add your frontend URL to `ALLOWED_ORIGINS`
- Check the URL format (no trailing slash)

**Migration Error**
```
Schema drift detected
```
- Run `bunx prisma migrate reset` (development only)
- Or run `bunx prisma migrate deploy` (production)

**Port Already in Use**
```
Error: listen EADDRINUSE :::3001
```
- Change the `PORT` environment variable
- Or kill the process using the port

### Debug Mode

Set `NODE_ENV=development` for detailed logging and error messages.

### Getting Help

1. Check the server logs for detailed error messages
2. Verify your environment variables are set correctly
3. Test the health endpoint: `GET /health`
4. Check database connectivity with Prisma Studio: `bunx prisma studio`
5. Verify the SQLite database file exists: `ls -la *.db`
