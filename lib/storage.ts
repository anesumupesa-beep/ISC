import "server-only";
import { Files } from "files-sdk";
import { neon } from "files-sdk/neon";

// Neon Object Storage bucket declared in neon.ts. Locally the adapter reads the AWS_* vars `neon deploy` pulls;
// Vercel reserves AWS_* names, so production sets the same values as NEON_STORAGE_*.
const env = process.env;
export const uploads = new Files({
  adapter: neon({
    bucket: "uploads",
    endpoint: env.NEON_STORAGE_ENDPOINT ?? env.AWS_ENDPOINT_URL_S3,
    region: env.NEON_STORAGE_REGION ?? env.AWS_REGION,
    accessKeyId: env.NEON_STORAGE_ACCESS_KEY_ID ?? env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.NEON_STORAGE_SECRET_ACCESS_KEY ?? env.AWS_SECRET_ACCESS_KEY,
  }),
});
