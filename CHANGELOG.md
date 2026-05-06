# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `Dockerfile`, `docker-compose.yml`, `.env.example`, and [docs/docker.md](docs/docker.md) for Linux host-network runs.

## [1.0.0] - 2026-05-06

### Added

- Initial stable release of the Transmission MCP server (Node.js / TypeScript).
- Stdio MCP transport with tools: `transmission_list_torrents`, `transmission_add_torrent`, `transmission_start_torrent`, `transmission_stop_torrent`, `transmission_remove_torrent`, `transmission_get_session`.
- Loopback-only `TRANSMISSION_RPC_URL` enforcement, required RPC Basic auth, URL/magnet validation, download-directory allowlist, and explicit confirmation for remove-with-local-data.
- Structured mutation logs on stderr (`transmission_mcp_mutation` JSON lines).
- Documentation: `README.md`, `QUICKSTART.md`, `docs/architecture.md`, `docs/security.md`.
- Tests (Vitest) for validators, config, and mocked Transmission RPC client behavior.
