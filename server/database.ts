import { Pool } from 'pg';
import { createClient } from 'redis';

// --- PostgreSQL Configuration ---
export const db = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'glasskom_social',
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT || '5432'),
  max: 20, // Connection pool size
  idleTimeoutMillis: 30000,
});

// --- Redis Configuration ---
export const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

export const redisPub = redisClient.duplicate();
export const redisSub = redisClient.duplicate();

export const initCache = async () => {
  await redisClient.connect();
  await redisPub.connect();
  await redisSub.connect();
  console.log('📦 Redis Connected');
};

// Helper for caching database queries
export const getOrSetCache = async (key: string, cb: () => Promise<any>, ttl = 3600) => {
  const cached = await redisClient.get(key);
  if (cached) return JSON.parse(cached);
  
  const freshData = await cb();
  await redisClient.setEx(key, ttl, JSON.stringify(freshData));
  return freshData;
};
