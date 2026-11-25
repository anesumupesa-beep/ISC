import "server-only";
import { Files } from "files-sdk";
import { neon } from "files-sdk/neon";

// Neon Object Storage bucket declared in neon.ts; credentials come from the AWS_* env vars `neon deploy` pulls.
export const uploads = new Files({ adapter: neon({ bucket: "uploads" }) });
