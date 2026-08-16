import { MongoMemoryServer } from "mongodb-memory-server";

/**
 * Disposable MongoDB for local development.
 *
 * Downloads and runs a real mongod on first use, so the app can be developed
 * without installing MongoDB or running Docker. Data lives in memory and is
 * discarded when this process exits — point MONGODB_URI at Atlas or a local
 * server when you need it to persist.
 *
 *   pnpm dev:db
 */
const PORT = 27017;

async function main() {
  const mongod = await MongoMemoryServer.create({
    instance: { port: PORT, dbName: "mockup-studio" },
  });

  console.log(`MongoDB listening on ${mongod.getUri()}`);
  console.log("Data is in memory only and will be lost when this exits.");

  const stop = async () => {
    await mongod.stop();
    process.exit(0);
  };

  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
