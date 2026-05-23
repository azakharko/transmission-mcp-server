# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.2] - 2026-05-21

### Added

- OpenClaw / Claude-compatible plugin manifests: [.claude-plugin/plugin.json](.claude-plugin/plugin.json) and [marketplace.json](marketplace.json).
- GitHub funding metadata: [.github/FUNDING.yml](.github/FUNDING.yml).

### Changed

- [Contributing.md](Contributing.md) refresh for release hygiene and contributor expectations.

### Housekeeping / dependencies

- Dev tooling bumps: ESLint **10.4.x**, `typescript-eslint` **8.59.4**, Vitest **`@vitest/coverage-v8` / `vitest` ~4.1.7**, `@types/node` **25.9.x**.

## [1.0.1] - 2026-05-07

### Added

- **RPC:** configurable per-request HTTP timeout via **`TRANSMISSION_RPC_TIMEOUT_MS`** (default 60s; **`0`** disables) using **`AbortSignal.timeout`** in [`TransmissionRpcClient`](src/transmission/rpcClient.ts).
- **Listing:** **`transmission_list_torrents`** accepts optional **`ids`** and **`limit`** (includes truncation metadata when results are capped).
- **Validation:** Zod-backed parsing of **`torrent-add`** RPC arguments ([`src/transmission/schemas.ts`](src/transmission/schemas.ts)).
- **Publishing:** npm **`files`** field, **`repository` / `bugs` / `homepage`**, **`prepare`** / **`prepublishOnly`**, and **`typecheck`** script ([`package.json`](package.json)).
- **Documentation:** [`docs/supply-chain.md`](docs/supply-chain.md).
- **CI:** GitHub Actions workflow (lint, typecheck, tests including coverage, build, Docker); [Dependabot](.github/dependabot.yml) for npm and GitHub Actions.

### Changed

- MCP server implementation now uses **[FastMCP](https://www.npmjs.com/package/fastmcp)** (**`fastmcp` ^4**) instead of calling **`@modelcontextprotocol/sdk`** directly. Tools register via **`addTransmissionTools`**; failures surface with **`UserError`**; successes return pretty-printed JSON text as before.

- Raised the minimum **[Node.js](https://nodejs.org/)** runtime to **`>=25.0.0`** (`engines` in `package.json`). **Docker** builder and runner images use **`node:25-alpine`**.

- Dependency stack: **`zod` ^4** (aligned with FastMCP); **removed** the direct **`@modelcontextprotocol/sdk`** dependency (still pulled transitively by FastMCP). Validation updates include **`z.looseObject`** for Transmission RPC shapes, **`prettifyError`** for parse errors, and **`refine`** (replacing deprecated **`superRefine`/`addIssue`** usage) on the download-dir allowlist string in **`loadConfig`**.

- **TypeScript** [`tsconfig.json`](tsconfig.json): set **`compilerOptions.types: ["node"]`** so **`node:`** imports and builtins resolve reliably (including **`tsc` 6.x** inside minimal Docker installs).

### Fixed

- **Docker build:** [`Dockerfile`](Dockerfile) builder runs **`npm ci --ignore-scripts --include=dev`** so **devDependencies** (TypeScript, **`@types/node`**) are still installed when the environment behaves like **`NODE_ENV=production`**, avoiding **`tsc`** failures in CI and image builds.

### Testing / tooling

- **Vitest (`test:coverage`)**: global **`v8`** thresholds (lines, branches, statements, functions). **[`src/mcp/tools.ts`](src/mcp/tools.ts)** is **excluded** from coverage via [`vitest.config.ts`](vitest.config.ts).

- Expanded tests (`index`, mutation log, MCP tool wiring stubs, Transmission operation helpers); **Vitest v4-compatible** mocks (`function`/class constructors instead of arrow-only **`mockImplementation`**) where **`new`** is required.

### Housekeeping / repository

- **`.gitignore`:** **`coverage/`** (Vitest HTML/JSON output).

### Application entry

- **`export async function main()`** and **`export function reportMainFailure()`** from [`src/index.ts`](src/index.ts). The process entry script only auto-starts **`main()`** when **`path.resolve(process.argv[1])`** matches **`path.resolve(fileURLToPath(import.meta.url))`** (works with **`npm`/`.bin`** shims and mixed path shapes).

## [1.0.0] - 2026-05-06

### Added

- Initial stable release of the Transmission MCP server (Node.js / TypeScript).
- Stdio MCP transport with tools: `transmission_list_torrents`, `transmission_add_torrent`, `transmission_start_torrent`, `transmission_stop_torrent`, `transmission_remove_torrent`, `transmission_get_session`.
- Loopback-only `TRANSMISSION_RPC_URL` enforcement, required RPC Basic auth, URL/magnet validation, download-directory allowlist, and explicit confirmation for remove-with-local-data.
- Structured mutation logs on stderr (`transmission_mcp_mutation` JSON lines).
- Documentation: `README.md`, `QUICKSTART.md`, `docs/architecture.md`, `docs/security.md`.
- Tests (Vitest) for validators, config, and mocked Transmission RPC client behavior.
