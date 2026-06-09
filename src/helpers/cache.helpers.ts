import type { CacheInvalidationGroup } from "../constants/cache.namespaces.js";
import { deleteCache } from "../utils/redis.js";

export const invalidateCache = async (group: CacheInvalidationGroup): Promise<void> => {
  await deleteCache(group);
};
