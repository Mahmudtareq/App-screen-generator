import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import { Asset, Project, User } from "@/models";

/**
 * Builds the indexes declared on the models.
 *
 * A deploy step rather than something the app does at runtime: `autoIndex` is off
 * in production so a schema change cannot block the first query while Mongo
 * builds an index. The Auth.js adapter also declares no indexes of its own, so
 * the unique constraint on `users.email` only exists because this runs.
 *
 *   pnpm sync-indexes
 *
 * The npm script sets `--conditions=react-server`. Without it, the `server-only`
 * guard that lib/db.ts imports resolves to its client entry point, which exists
 * purely to throw — that guard is written for Next's bundler, not plain Node.
 */
async function main() {
  await connectDB();

  const results = await Promise.all(
    [User, Project, Asset].map(async (model) => {
      await model.syncIndexes();
      const indexes = await model.collection.indexes();
      return `${model.modelName}: ${indexes.map((i) => i.name).join(", ")}`;
    }),
  );

  for (const line of results) console.log(line);

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
