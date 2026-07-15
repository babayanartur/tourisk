import mongoose from "mongoose";
import { config } from "./config.js";
import { bootstrapGameContent } from "./services/bootstrapGameContent.js";

async function main() {
  await mongoose.connect(config.mongoUri);
  const summary = await bootstrapGameContent({ forceAdminPassword: true, forceContent: true });
  await mongoose.disconnect();
  console.log("Tourisk seed completed", summary);
  console.log(`Admin: ${config.adminLogin} / ${config.adminPassword}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
