import { rmSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const cachePath = path.resolve(projectRoot, ".next");

if (
  path.basename(cachePath) !== ".next" ||
  path.dirname(cachePath) !== projectRoot
) {
  throw new Error("Refusing to remove an unexpected cache path.");
}

rmSync(cachePath, {
  recursive: true,
  force: true,
  maxRetries: 10,
  retryDelay: 250,
});
console.log("Next.js cache cleared:", cachePath);
