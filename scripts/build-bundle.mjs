import * as esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outFile = path.join(rootDir, "dist", "index.js");
const optionalPeerStub = path.join(rootDir, "scripts", "stubs", "optional-peer.mjs");
const undiciStub = path.join(rootDir, "scripts", "stubs", "undici.mjs");

/** Optional schema-library peers resolved dynamically by xsschema (via fastmcp). */
const optionalPeerAliases = [
  "effect",
  "sury",
  "@valibot/to-json-schema",
];

fs.mkdirSync(path.dirname(outFile), { recursive: true });

await esbuild.build({
  entryPoints: [path.join(rootDir, "src", "index.ts")],
  outfile: outFile,
  bundle: true,
  platform: "node",
  target: "node25",
  format: "esm",
  sourcemap: true,
  alias: {
    undici: undiciStub,
    ...Object.fromEntries(
      optionalPeerAliases.map((name) => [name, optionalPeerStub]),
    ),
  },
  external: ["../package.json"],
});

await fs.promises.chmod(outFile, 0o755);
