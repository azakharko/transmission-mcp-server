# AGENTS.md — transmission-mcp-server

## Quick commands

```
npm run build        # esbuild bundle → dist/index.js
npm run build:types  # tsc emit (dist/*.d.ts)
npm test             # vitest run
npm run typecheck    # tsc --noEmit
npm run lint         # eslint src tests
```

CI runs in order: lint → typecheck → test → build → `git diff --exit-code dist/` (verify committed dist matches bundle output).

## Architecture

- **Entry:** `src/index.ts` — loads config, creates `TransmissionRpcClient`, registers 6 tools via `addTransmissionTools()`, starts FastMCP stdio.
- **Config validation:** `src/config.ts` — URL loopback enforcement, allowlisted download dirs, timeout parsing (via Zod).
- **RPC layer:** `src/transmission/rpcClient.ts` — HTTP JSON-RPC calls to Transmission daemon.
- **Operations:** `src/transmission/operations.ts` — one function per RPC method (list/add/start/stop/remove/session-get).
- **Tool registration:** `src/mcp/tools.ts` — all 6 MCP tools with Zod schemas.
- **Validation:** `src/validators/` — torrent source (http/https | magnet), paths, remove confirmation guard.
- **Mutation logging:** `src/log/mutationLog.ts` — stderr JSON audit lines for state-changing ops.

## Non-obvious constraints

- **RPC URL must be loopback** (`127.0.0.1` or `::1`). Any other hostname throws at startup. Path must be empty or end with `/transmission/rpc`.
- **Stdout is MCP protocol.** Never write to stdout outside the FastMCP framework (warnings/audit go to stderr).
- **`dist/index.js` is a committed esbuild bundle** (not just tsc output). CI verifies it matches. Don't run `tsc` alone for production — use `npm run build`.
- **`remove_torrent` with `delete_local_data: true` requires `confirm_delete_local_data: true`** or the tool throws. No silent deletes.
- Environment: `TRANSMISSION_ALLOWED_DOWNLOAD_DIRS` is comma-separated absolute paths, normalized/deduped at startup.

## Testing notes

- Tests use vitest globals (`describe`, `it`, etc.) with node environment — no per-test imports needed for top-level names.
- Mocks in `tests/index.test.ts`: `fastmcp`, `config.js`, `transmission/rpcClient.js`. When adding new code in `src/`, check if these mocks need updates.
- Coverage threshold: lines 45%, branches 55%, functions 70%. Excludes `src/mcp/tools.ts` from coverage (tool wrappers are thin).
