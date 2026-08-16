import "server-only";

import mongoose, { type Mongoose } from "mongoose";

import { env } from "@/config/env";

/**
 * Cached Mongoose connection.
 *
 * Next.js reloads modules on every edit in development and may cold-start many
 * serverless instances in production. Without a cache anchored outside the module
 * graph, each reload opens a fresh connection pool until Mongo starts refusing
 * them. The promise is cached too, not just the connection, so concurrent callers
 * during startup await the same handshake instead of racing to open several.
 *
 * Only ever called from server actions and route handlers — never from a client
 * component, and never from proxy.ts, which runs on every matched request and has
 * no business opening a database pool.
 */
declare global {
  var __mongooseCache:
    | { conn: Mongoose | null; promise: Promise<Mongoose> | null }
    | undefined;
}

const cache = (globalThis.__mongooseCache ??= { conn: null, promise: null });

export async function connectDB(): Promise<Mongoose> {
  if (cache.conn) return cache.conn;

  cache.promise ??= mongoose.connect(env.MONGODB_URI, {
    dbName: env.MONGODB_DB_NAME,
    // Fail fast instead of queuing operations against a connection that may never
    // arrive — a buffered query that times out 30s later is far harder to debug.
    bufferCommands: false,
    // Index builds belong in a deploy step (pnpm sync-indexes), not on the
    // request path where they would block the first query after a schema change.
    autoIndex: env.NODE_ENV !== "production",
  });

  try {
    cache.conn = await cache.promise;
  } catch (error) {
    // Clear the rejected promise so the next request retries rather than
    // re-awaiting a permanently failed handshake.
    cache.promise = null;
    throw error;
  }

  return cache.conn;
}

/**
 * The raw MongoClient backing Mongoose, for the Auth.js adapter.
 *
 * The adapter wants a `MongoClient`, not a Mongoose instance. Handing it the one
 * Mongoose already owns keeps a single connection pool instead of two competing
 * ones against the same cluster.
 */
export async function getMongoClient() {
  const connection = await connectDB();
  return connection.connection.getClient();
}
