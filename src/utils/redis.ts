import { getRedisClient, isRedisReady } from "../config/redis.js";
import {
  CACHE_INVALIDATION_GROUPS,
  type CacheInvalidationGroup,
} from "../constants/cache.namespaces.js";

const KEY_PREFIX = process.env.CACHE_KEY_PREFIX || "sky-grp";

const collectKeysMatching = async (pattern: string): Promise<string[]> => {
  const redisClient = getRedisClient();
  const keys: string[] = [];

  for await (const keyChunk of redisClient.scanIterator({
    MATCH: pattern,
    COUNT: 100,
  })) {
    if (Array.isArray(keyChunk)) {
      for (const key of keyChunk) {
        if (key) {
          keys.push(key);
        }
      }
    } else if (keyChunk) {
      keys.push(keyChunk);
    }
  }

  if (keys.length === 0) {
    const fallbackKeys = await redisClient.keys(pattern);

    if (fallbackKeys.length > 0) {
      keys.push(...fallbackKeys.filter((key) => key.length > 0));
    }
  }

  return keys;
};

const deleteCacheKey = async (key: string): Promise<number | null> => {
  if (!isRedisReady()) {
    return null;
  }

  try {
    return await getRedisClient().del(key);
  } catch {
    return null;
  }
};

export const buildCacheKey = (namespace: string, scope: string, path: string): string =>
  `${KEY_PREFIX}:${namespace}:${scope}:${path}`;

export const getCache = async <T = unknown>(key: string): Promise<T | null> => {
  if (!isRedisReady()) {
    return null;
  }

  try {
    const reply = await getRedisClient().get(key);

    if (!reply) {
      return null;
    }

    return JSON.parse(reply) as T;
  } catch {
    return null;
  }
};

export const setCache = async (
  key: string,
  value: unknown,
  expiryInSeconds = 300
): Promise<string | null> => {
  if (!isRedisReady()) {
    return null;
  }

  try {
    return await getRedisClient().setEx(key, expiryInSeconds, JSON.stringify(value));
  } catch {
    return null;
  }
};

export const deleteCache = async (
  keyOrGroup: CacheInvalidationGroup | string
): Promise<number | null> => {
  if (!isRedisReady()) {
    return null;
  }

  const namespaces =
    keyOrGroup in CACHE_INVALIDATION_GROUPS
      ? CACHE_INVALIDATION_GROUPS[keyOrGroup as CacheInvalidationGroup]
      : undefined;

  if (namespaces) {
    let totalDeleted = 0;

    for (const namespace of namespaces) {
      const keys = await collectKeysMatching(`${KEY_PREFIX}:${namespace}:*`);

      for (const key of keys) {
        totalDeleted += (await deleteCacheKey(key)) ?? 0;
      }
    }

    return totalDeleted;
  }

  return deleteCacheKey(keyOrGroup);
};
