# transmission-mcp-server

Releases and history: [CHANGELOG.md](CHANGELOG.md). Contributing: [Contributing.md](Contributing.md).

## Features

- **Loopback-only URLs** enforced for `TRANSMISSION_RPC_URL` (must target `127.0.0.1` or `::1`).
- **Required RPC username and password** (Basic authentication on every request).
- **URL and magnet validation** before `torrent-add`.
- **Download directory allowlist** plus optional default; multi-dir setups require an explicit directory or `TRANSMISSION_DEFAULT_DOWNLOAD_DIR`.
- **Double confirmation** for `torrent-remove` with `delete_local_data` (must pass `confirm_delete_local_data: true`).
- **Structured mutation logs** (JSON Lines on **stderr**) for add / start / stop / remove.
- **Stdio MCP transport** — compatible with Cursor, Claude Desktop, and [OpenClaw](https://docs.openclaw.ai/cli/mcp) stdio clients.

## MCP tools

| Tool | Purpose |
|------|---------|
| `transmission_list_torrents` | `torrent-get` with id, name, status, progress, rates, sizes, `downloadDir`, errors |
| `transmission_add_torrent` | `torrent-add` from validated `http(s)` URL or magnet |
| `transmission_start_torrent` | `torrent-start` |
| `transmission_stop_torrent` | `torrent-stop` |
| `transmission_remove_torrent` | `torrent-remove` (optional delete-local-data + confirm) |
| `transmission_get_session` | `session-get` (read-only) |

## Requirements

- **Node.js** ≥ 18.18
- **Transmission** with RPC enabled, bound to loopback, and protected with RPC credentials (see [Ubuntu / Transmission](#ubuntu-and-transmission-hardening)).

## Install and build

```bash
npm install
npm run build
```

The entry point is `dist/index.js` (also exposed as the `transmission-mcp-server` bin if installed from the package).

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TRANSMISSION_RPC_URL` | No | Default `http://127.0.0.1:9091/transmission/rpc`. Host must be `127.0.0.1` or `::1`. Path must be empty or end with `/transmission/rpc`. |
| `TRANSMISSION_RPC_USER` | **Yes** | RPC username (`rpc-username` in Transmission). |
| `TRANSMISSION_RPC_PASSWORD` | **Yes** | RPC password (`rpc-password`). |
| `TRANSMISSION_ALLOWED_DOWNLOAD_DIRS` | **Yes** | Comma-separated **absolute** paths Transmission may use for `download-dir` on add. Normalized and deduplicated at startup. |
| `TRANSMISSION_DEFAULT_DOWNLOAD_DIR` | Sometimes | Required when multiple dirs are allowlisted and the tool omits `download_dir`. Must be one of the allowlisted paths. If only one dir is allowlisted, it is used automatically when omitted. |

**Secrets:** pass via your MCP host’s environment (not via tool arguments). Do **not** put credentials in the URL userinfo.

## Run (stdio)

```bash
export TRANSMISSION_RPC_USER='...'
export TRANSMISSION_RPC_PASSWORD='...'
export TRANSMISSION_ALLOWED_DOWNLOAD_DIRS='/var/lib/transmission-daemon/downloads'
node dist/index.js
```

Stdout is reserved for MCP JSON-RPC; **stderr** carries warnings and **one JSON object per line** for mutations (`type: "transmission_mcp_mutation"`).

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

Use a server name matching `^[a-zA-Z0-9_-]+$` when registering in strict clients.

## OpenClaw

OpenClaw can run stdio MCP servers as child processes and filters dangerous **interpreter startup** environment variables (for example `NODE_OPTIONS`) from the server `env` block—this is expected. Configure credentials and Transmission-specific variables with normal `TRANSMISSION_*` names.

Register a saved definition (writes OpenClaw config; adjust paths):

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

Remote MCP transports (`sse`, `streamable-http`) are not implemented in this server; stdio is the portable option for OpenClaw and local agents.

## Ubuntu and Transmission hardening

The MCP server **cannot** bind Transmission for you. On the daemon:

1. Set **`rpc-bind-address`** to `"127.0.0.1"` (or IPv6 loopback only if you use `::1`).
2. Set **`rpc-username`** / **`rpc-password`** and keep **`rpc-authentication-required`** on.
3. If you use a whitelist, restrict it to loopback only.
4. Prefer OS firewall rules so nothing off‑host reaches the RPC port.

After editing `settings.json`, restart `transmission-daemon` (e.g. `sudo systemctl restart transmission-daemon`).

On startup this server optionally calls `session-get` and **warns** (stderr JSON line with `type: "transmission_mcp_warning"`) if Transmission’s configured **`download-dir`** is not in your allowlist.

## Remove + delete local data

`transmission_remove_torrent` accepts `delete_local_data` (default `false`). If `delete_local_data` is `true`, **`confirm_delete_local_data` must also be `true`** or the tool returns an error without calling Transmission.

## Development

```bash
npm test
npm run lint
```

More detail: [QUICKSTART.md](QUICKSTART.md), [docs/architecture.md](docs/architecture.md), [docs/security.md](docs/security.md).

## License

Apache-2.0 — see [LICENSE](LICENSE).
