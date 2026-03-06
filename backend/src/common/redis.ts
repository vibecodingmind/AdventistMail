import { createClient } from 'redis';
import { config } from '../config/index.js';

let redisClient: ReturnType<typeof createClient> | null = null;
let redisFailed = false;

// In-memory fallback when Redis is not available (dev only)
const memoryStore = new Map<string, { data: string; expires: number }>();

export async function getRedis(): Promise<ReturnType<typeof createClient> | null> {
  if (redisClient) return redisClient;
  if (redisFailed) return null;
  try {
    redisClient = createClient({ url: config.redis.url });
    redisClient.on('error', (err) => console.error('Redis error:', err));
    await redisClient.connect();
    return redisClient;
  } catch (err) {
    redisFailed = true;
    console.warn('Redis not available, using in-memory fallback for IMAP credentials');
    return null;
  }
}

const CREDS_TTL = 3600; // 1 hour

export async function storeImapCredentials(
  userId: string,
  email: string,
  password: string
): Promise<void> {
  const redis = await getRedis();
  const key = `imap:creds:${userId}`;
  const value = JSON.stringify({ email, password });
  if (redis) {
    await redis.setEx(key, CREDS_TTL, value);
  } else {
    memoryStore.set(key, { data: value, expires: Date.now() + CREDS_TTL * 1000 });
  }
}

export async function getImapCredentials(
  userId: string
): Promise<{ email: string; password: string } | null> {
  const redis = await getRedis();
  const key = `imap:creds:${userId}`;
  if (redis) {
    const data = await redis.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as { email: string; password: string };
    } catch {
      return null;
    }
  }
  const entry = memoryStore.get(key);
  if (!entry || entry.expires < Date.now()) {
    memoryStore.delete(key);
    return null;
  }
  try {
    return JSON.parse(entry.data) as { email: string; password: string };
  } catch {
    return null;
  }
}

export async function deleteImapCredentials(userId: string): Promise<void> {
  const redis = await getRedis();
  const key = `imap:creds:${userId}`;
  if (redis) {
    await redis.del(key);
  } else {
    memoryStore.delete(key);
  }
}
