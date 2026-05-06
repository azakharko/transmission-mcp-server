# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Publishing:** `files` whitelist, `repository` / `bugs` / `homepage`, `prepare` (build on install) and `prepublishOnly` (lint + test before publish), `typecheck` and `test:coverage` scripts. [LICENSE](LICENSE) copyright notice completed.
- **CI:** GitHub Actions workflow (lint, typecheck, test + coverage, build, Docker build). [Dependabot](.github/dependabot.yml) for npm and Actions.
- **RPC reliability:** `TRANSMISSION_RPC_TIMEOUT_MS` (default 60s; `0` disables) with `AbortSignal.timeout` in [`TransmissionRpcClient`](src/transmission/rpcClient.ts).
- **Listing:** `transmission_list_torrents` optional `ids` and `limit` (truncation metadata when capped).
- **Validation:** Zod parsing for `torrent-add` RPC arguments in [`src/transmission/schemas.ts`](src/transmission/schemas.ts).
- **Docs:** [docs/supply-chain.md](docs/supply-chain.md). **Docker:** builder/runner use `npm ci --ignore-scripts` so `prepare` does not run before sources are copied.
- **Tests:** coverage thresholds (v8), schema and listTorrents unit tests, RPC timeout test.

## [1.0.0] - 2026-05-06

### Added

- Initial stable release of the Transmission MCP server (Node.js / TypeScript).
- Stdio MCP transport with tools: `transmission_list_torrents`, `transmission_add_torrent`, `transmission_start_torrent`, `transmission_stop_torrent`, `transmission_remove_torrent`, `transmission_get_session`.
- Loopback-only `TRANSMISSION_RPC_URL` enforcement, required RPC Basic auth, URL/magnet validation, download-directory allowlist, and explicit confirmation for remove-with-local-data.
- Structured mutation logs on stderr (`transmission_mcp_mutation` JSON lines).
- Documentation: `README.md`, `QUICKSTART.md`, `docs/architecture.md`, `docs/security.md`.
- Tests (Vitest) for validators, config, and mocked Transmission RPC client behavior.
