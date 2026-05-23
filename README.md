# transmission-mcp-server

MCP server for [Transmission](https://transmissionbt.com/): tools talk to the daemon **only** through its JSON-RPC HTTP API (same pattern as the web UI). No shell access.

Releases: [CHANGELOG.md](CHANGELOG.md). 
Contributing: [Contributing.md](Contributing.md). 
Quickstart: [QUICKSTART.md](QUICKSTART.md). 
Docker: [docs/docker.md](docs/docker.md).

## What this MCP server does (and what it does not)

### Does

- Exposes a **fixed set of tools** that map to Transmission RPC: list torrents, add from a validated URL or magnet, start/stop, remove (optional delete of local data), and read session settings.
- **Validates** torrent sources (`http` / `https` or `magnet:` with `xt=urn:btih:`), **allowlists** download directories, and **requires RPC credentials** on every request.
- Runs as a **stdio MCP** process: the client spawns it and speaks MCP JSON-RPC over stdin/stdout.

### Does not

- Execute **shell commands**, arbitrary binaries, or anything other than HTTP JSON-RPC to Transmission.
- **Configure or bind** Transmission for you (daemon must use loopback bind, auth, etc.—see [Ubuntu and Transmission hardening](#ubuntu-and-transmission-hardening)).
- Implement **SSE** or **HTTP/streamable HTTP** MCP transports inside this process (see [Supported transports](#supported-transports)).

## Requirements

- **Node.js** ≥ 18.18
- **Transmission** with RPC enabled on **loopback**, with **authentication** (see hardening section)

## Supported transports

| Transport | Supported by this package | Notes |
|-----------|---------------------------|--------|
| **Stdio** | **Yes** | Default. The MCP host runs `node …/dist/index.js` (or the published bin); protocol on stdin/stdout. **stderr** is for warnings and mutation audit lines—not MCP. |
| **SSE** | No | Not exposed here. Clients such as [OpenClaw](https://docs.openclaw.ai/cli/mcp) may connect to *other* MCP servers over SSE; this repo does not ship an SSE server. |
| **HTTP / streamable HTTP** | No | Same as SSE. Could be added in a future release. |

For OpenClaw, prefer the [marketplace bundle install](#openclaw-marketplace-install-bundle) (stdio MCP merged into embedded Pi). For other local editors, use **stdio** and point `command`/`args` at this server.

## Installation

### From source (clone)

```bash
git clone <repository-url>
cd transmission-mcp-server
npm ci
npm run build
```

Entry point: `dist/index.js`. Package bin: `transmission-mcp-server` (after `npm link` or local `npm install`).

### npx (after npm publish)

When the package is published to the npm registry, the tarball includes a self-contained bundled `dist/index.js` (built during `prepare` before publish):

```bash
TRANSMISSION_RPC_USER='…' \
TRANSMISSION_RPC_PASSWORD='…' \
TRANSMISSION_ALLOWED_DOWNLOAD_DIRS='/var/lib/transmission-daemon/downloads' \
npx -y transmission-mcp-server
```

Adjust env vars as needed. If the published package does not yet include built `dist/`, use **from source** until the release pipeline publishes artifacts.

### Docker

The repo includes a **Dockerfile** and **docker-compose.yml**. Transmission must be reachable at **loopback** from the container’s perspective; on **Linux** this usually means **`--network host`** (or Compose `network_mode: host`) so `http://127.0.0.1:9091/transmission/rpc` hits the **host** daemon.

```bash
cp .env.example .env
# edit .env — RPC user, password, allowlisted paths

docker build -t transmission-mcp-server:local .
docker run --rm -i --network host --env-file .env transmission-mcp-server:local
```

Compose (same constraints; **`-i`** for MCP stdio):

```bash
docker compose build
docker compose run --rm -i transmission-mcp
```

**Docker Desktop (macOS/Windows):** host networking is not equivalent to Linux; prefer running `node dist/index.js` on the host or see [docs/docker.md](docs/docker.md) for details. **Allowlisted paths** are validated as strings (Transmission’s host paths); you do not need to bind-mount download dirs into the MCP container for that check.

Full guide: [docs/docker.md](docs/docker.md).

### uvx

**Not applicable.** This project is **Node.js/TypeScript**. Use **npx** or run from source, not `uvx`.

## Required environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TRANSMISSION_RPC_URL` | No | Default `http://127.0.0.1:9091/transmission/rpc`. Host must be `127.0.0.1` or `::1`. Path must be empty or end with `/transmission/rpc`. |
| `TRANSMISSION_RPC_USER` | **Yes** | RPC username (`rpc-username` in Transmission). |
| `TRANSMISSION_RPC_PASSWORD` | **Yes** | RPC password (`rpc-password`). |
| `TRANSMISSION_ALLOWED_DOWNLOAD_DIRS` | **Yes** | Comma-separated **absolute** paths allowed for `download-dir` on add. Normalized and deduplicated at startup. |
| `TRANSMISSION_DEFAULT_DOWNLOAD_DIR` | Sometimes | Required when **multiple** dirs are allowlisted and `transmission_add_torrent` omits `download_dir`. Must be listed in `TRANSMISSION_ALLOWED_DOWNLOAD_DIRS`. If only **one** dir is allowlisted, it is used when omitted. |
| `TRANSMISSION_RPC_TIMEOUT_MS` | No | Per-request HTTP timeout in ms. Default **60000**. Minimum **1000** when set to a positive value. Set **0** to disable timeouts (not recommended). Maximum **300000** (5 minutes). |

**Secrets:** pass via the MCP host environment (not tool arguments). Do **not** put credentials in URL userinfo.

## Security notes

- **Loopback RPC URL** is enforced in config; configure the daemon with **`rpc-bind-address`** on localhost and **RPC auth** enabled.
- **Download paths** are allowlisted; adds cannot target arbitrary filesystem locations through this server.
- **Remove + delete data** requires `confirm_delete_local_data: true` when `delete_local_data` is true.
- **Mutation audit** lines on **stderr** (`type: "transmission_mcp_mutation"`) for add / start / stop / remove; passwords are not logged. Startup warnings may include **allowlisted path lists**; treat shared stderr as potentially sensitive.
- **Stdout** must stay clean for MCP; do not pipe extra data into the server’s stdout.
- Deeper checklist: [docs/security.md](docs/security.md). Dependency posture: [docs/supply-chain.md](docs/supply-chain.md).

## Run (stdio)

```bash
export TRANSMISSION_RPC_USER='…'
export TRANSMISSION_RPC_PASSWORD='…'
export TRANSMISSION_ALLOWED_DOWNLOAD_DIRS='/var/lib/transmission-daemon/downloads'
node dist/index.js
```

Stderr carries startup warnings (for example allowlist vs session `download-dir`) and one JSON object per mutation line.

## OpenClaw

OpenClaw runs stdio MCP servers as child processes and may block risky **interpreter** env vars in the server `env` block (for example `NODE_OPTIONS`). Use normal `TRANSMISSION_*` variables for credentials and paths.

### OpenClaw marketplace install (bundle)

This repository ships a [Claude-compatible plugin bundle](https://docs.openclaw.ai/plugins/bundles) (`.claude-plugin/plugin.json` + root `.mcp.json`) and a [`marketplace.json`](marketplace.json) so OpenClaw can install it from GitHub.

OpenClaw **copies the repository tree** for bundle installs—it does **not** run `npm install`, `prepare`, or install runtime dependencies. The repo therefore **commits a self-contained** [`dist/index.js`](dist/index.js) (esbuild bundle of the server and its npm deps) so the install smoke check and MCP stdio launch succeed.

**Install** (the first argument must match `plugins[].name` in `marketplace.json`):

```bash
openclaw plugins install transmission-mcp-server \
  --marketplace https://github.com/azakharko/transmission-mcp-server.git
```

**Alternative (npm registry):**

```bash
openclaw plugins install npm:transmission-mcp-server@1.0.3 --pin
```

npm installs also skip install scripts; the published tarball must already include `dist/` (built during `npm publish` via `prepare`). Pin the version for reproducible installs.

**Discover** entries before installing:

```bash
openclaw plugins marketplace list https://github.com/azakharko/transmission-mcp-server.git --json
```

**Without a marketplace file**, you can install the repo directly:

```bash
openclaw plugins install git:github.com/azakharko/transmission-mcp-server
```

After install, **restart the OpenClaw gateway** so the plugin loads ([plugin bundles](https://docs.openclaw.ai/plugins/bundles)).

**Environment:** the bundle `.mcp.json` wires required variables from the **host** process into the MCP child via `${TRANSMISSION_RPC_USER}`, `${TRANSMISSION_RPC_PASSWORD}`, and `${TRANSMISSION_ALLOWED_DOWNLOAD_DIRS}`. Export those (or set them on the gateway) before starting OpenClaw—same semantics as [Required environment variables](#required-environment-variables). Optional variables (`TRANSMISSION_RPC_URL`, `TRANSMISSION_DEFAULT_DOWNLOAD_DIR`, `TRANSMISSION_RPC_TIMEOUT_MS`) are **not** set in `.mcp.json`; if you need them, define them in the gateway environment so the child inherits them.

**Tool names in embedded Pi:** bundle MCP tools are exposed with a server prefix and delimiter, e.g. `transmission-mcp__transmission_list_torrents` instead of bare `transmission_list_torrents` ([MCP for Pi](https://docs.openclaw.ai/plugins/bundles#mcp-for-pi)). Profile allow/deny lists may use those prefixed names or the `bundle-mcp` plugin key.

**Troubleshooting installs:** `OPENCLAW_PLUGIN_LIFECYCLE_TRACE=1 openclaw plugins install …` prints phase timings to stderr while keeping JSON output parseable ([Plugins CLI](https://docs.openclaw.ai/cli/plugins)).

### OpenClaw manual MCP registry (`openclaw mcp set`)

If you prefer the central `mcp.servers` registry instead of the bundle, set a stdio server yourself. Server names must match `^[a-zA-Z0-9_-]+$` (for example `transmission-mcp`).

```bash
openclaw mcp set transmission-mcp '{
  "command": "node",
  "args": ["/absolute/path/to/transmission-mcp-server/dist/index.js"],
  "env": {
    "TRANSMISSION_RPC_USER": "your-user",
    "TRANSMISSION_RPC_PASSWORD": "your-password",
    "TRANSMISSION_ALLOWED_DOWNLOAD_DIRS": "/var/lib/transmission-daemon/downloads"
  }
}'
```

See [OpenClaw MCP docs](https://docs.openclaw.ai/cli/mcp.md).

## Cursor / generic MCP client example

```json
{
  "mcpServers": {
    "transmission-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/transmission-mcp-server/dist/index.js"],
      "env": {
        "TRANSMISSION_RPC_USER": "your-user",
        "TRANSMISSION_RPC_PASSWORD": "your-password",
        "TRANSMISSION_ALLOWED_DOWNLOAD_DIRS": "/var/lib/transmission-daemon/downloads"
      }
    }
  }
}
```

## Example tool calls / capabilities

Tools are invoked by the MCP client as `tools/call` with a `name` and `arguments`. Shapes below are the **arguments** object (names match the registered tools).

| Tool | Arguments (JSON shape) | Notes |
|------|------------------------|--------|
| `transmission_list_torrents` | `{}` or see below | Lists torrents. Optional `"ids": [1, 2]` to query specific ids. Optional `"limit": 100` caps how many are returned; response may include `"truncated": true` and `"total_count"` when capped. Large daemons: use **`ids`** or **`limit`** so responses stay small for MCP clients. |
| `transmission_add_torrent` | `{ "url": "https://…/file.torrent" }` or magnet string | Optional `"download_dir": "/absolute/path"` if allowlist/default rules require it. |
| `transmission_start_torrent` | `{ "id": 1 }` | Numeric torrent id. |
| `transmission_stop_torrent` | `{ "id": 1 }` | |
| `transmission_remove_torrent` | `{ "id": 1, "delete_local_data": false }` | If `"delete_local_data": true`, also set `"confirm_delete_local_data": true` or the tool errors without removing. |
| `transmission_get_session` | `{}` | Read-only session fields. |

Example **`transmission_list_torrents`** (subset + cap):

```json
{
  "ids": [1, 2, 3],
  "limit": 50
}
```

Example **`transmission_add_torrent`** arguments:

```json
{
  "url": "magnet:?xt=urn:btih:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa&dn=Example",
  "download_dir": "/var/lib/transmission-daemon/downloads"
}
```

Example **`transmission_remove_torrent`** (delete downloaded data—destructive):

```json
{
  "id": 42,
  "delete_local_data": true,
  "confirm_delete_local_data": true
}
```

## Ubuntu and Transmission hardening

The MCP server **cannot** bind Transmission for you. On the daemon:

1.  Set **`rpc-bind-address`** to `"127.0.0.1"` (or IPv6 loopback only if you use `::1`).
2.  Set **`rpc-username`** / **`rpc-password`** and keep **`rpc-authentication-required`** on.
3.  If you use a whitelist, restrict it to loopback only.
4.  Prefer OS firewall rules so nothing off-host reaches the RPC port.

After editing `settings.json`, restart `transmission-daemon` (e.g. `sudo systemctl restart transmission-daemon`).

On startup this server may call `session-get` and **warn** on stderr (`type: "transmission_mcp_warning"`) if Transmission’s session **`download-dir`** is outside your allowlist.

## Development

```bash
npm test
npm run lint
```

Architecture: [docs/architecture.md](docs/architecture.md).

## Future development

- Optional in-process **SSE** or **streamable HTTP** MCP transport for remote access (today only stdio is implemented).
- Published image on a container registry and a documented **npm publish** cadence with the current **`files`** / **`prepare`** layout.
- Richer listing (cursor pagination, field selection) and optional session/torrent tuning tools, if demand warrants.

## License

Apache-2.0 — see [LICENSE](LICENSE).
