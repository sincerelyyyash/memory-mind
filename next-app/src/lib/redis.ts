import { Redis } from '@upstash/redis';
import { Message, CreateMessage } from '@/types/message';
import { nanoid } from 'nanoid';

let redisClient: Redis | null = null;

const getRedisClient = () => {
  if (!redisClient) {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      throw new Error('Redis environment variables are not set');
    }
    
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  
  return redisClient;
};

const MESSAGES_KEY_PREFIX = 'messages:';
const MESSAGES_LIST_KEY_PREFIX = 'messages_list:';

export const saveMessage = async (userId: string, messageData: CreateMessage): Promise<Message> => {
  const redis = getRedisClient();
  const message: Message = {
    id: nanoid(),
    userId,
    content: messageData.content,
    role: messageData.role,
    timestamp: new Date(),
  };

  const messageKey = `${MESSAGES_KEY_PREFIX}${message.id}`;
  const listKey = `${MESSAGES_LIST_KEY_PREFIX}${userId}`;

  // Save message data
  await redis.hset(messageKey, {
    id: message.id,
    userId: message.userId,
    content: message.content,
    role: message.role,
    timestamp: message.timestamp.toISOString(),
  });

  // Add message ID to user's message list
  await redis.lpush(listKey, message.id);

  // Keep only last 100 messages per user
  await redis.ltrim(listKey, 0, 99);

  return message;
};

export const getMessages = async (userId: string, limit: number = 50): Promise<Message[]> => {
  const redis = getRedisClient();
  const listKey = `${MESSAGES_LIST_KEY_PREFIX}${userId}`;
  
  // Get message IDs from the list
  const messageIds = await redis.lrange(listKey, 0, limit - 1);
  
  if (messageIds.length === 0) {
    return [];
  }

  // Get all messages in parallel
  const messageKeys = messageIds.map(id => `${MESSAGES_KEY_PREFIX}${id}`);
  const messagesData = await Promise.all(
    messageKeys.map(key => redis.hgetall(key))
  );

  // Convert to Message objects and filter out any null results
  const messages: Message[] = messagesData
    .filter(data => data && typeof data === 'object')
    .map(data => {
      const messageData = data as Record<string, string>;
      return {
        id: messageData.id,
        userId: messageData.userId,
        content: messageData.content,
        role: messageData.role as 'user' | 'assistant',
        timestamp: new Date(messageData.timestamp),
      };
    })
    .reverse(); // Reverse to get chronological order

  return messages;
};

export const publishMessage = async (userId: string, message: Message): Promise<void> => {
  const redis = getRedisClient();
  // For real-time features if needed later
  const channel = `chat:${userId}`;
  await redis.publish(channel, JSON.stringify(message));
};

export default getRedisClient; 