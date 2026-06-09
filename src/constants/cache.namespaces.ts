export const CACHE_NAMESPACES = {
  PRODUCTS: "products",
  ORDERS: "orders",
  AUTH: "auth",
} as const;

export const CACHE_INVALIDATION_GROUPS = {
  products: [CACHE_NAMESPACES.PRODUCTS],
  orders: [CACHE_NAMESPACES.ORDERS],
  auth: [CACHE_NAMESPACES.AUTH],
  productMutation: [CACHE_NAMESPACES.PRODUCTS, CACHE_NAMESPACES.ORDERS],
  orderMutation: [CACHE_NAMESPACES.ORDERS, CACHE_NAMESPACES.PRODUCTS],
  authMutation: [CACHE_NAMESPACES.AUTH],
} as const;

export type CacheInvalidationGroup = keyof typeof CACHE_INVALIDATION_GROUPS;
