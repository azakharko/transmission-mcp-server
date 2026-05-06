# Running in Docker

The server is a **stdio** MCP process: something must attach **stdin/stdout** (your MCP client, or an interactive `docker run -i` / `docker compose run -i`).

This project enforces a **loopback-only** `TRANSMISSION_RPC_URL` (`127.0.0.1` or `::1`). Inside a container, the host’s `127.0.0.1` is **not** the host unless you use **host networking** (Linux) or an equivalent setup.

## Linux (recommended): host network

Transmission should listen on the host at `127.0.0.1` (see [README](../README.md#ubuntu-and-transmission-hardening)).

### Build

```bash
docker build -t transmission-mcp-server:local .
```

### Run (interactive stdio)

```bash
docker run --rm -i \
  --network host \
  --env-file .env \
  transmission-mcp-server:local
```

Create `.env` from [.env.example](../.env.example) so variables are set inside the container.

### Docker Compose

```bash
cp .env.example .env
# edit .env
docker compose build
docker compose run --rm -i transmission-mcp
```

- `network_mode: host` lets `http://127.0.0.1:9091/transmission/rpc` reach **the host’s** Transmission.
- **`-i`** keeps stdin open for MCP.

## MCP clients that spawn Docker

Point `command`/`args` at Docker so the client inherits the container’s stdio. Example shape (adjust image tag and env file path):

```json
{
  "mcpServers": {
    "transmission-mcp": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "--network",
        "host",
        "--env-file",
        "/absolute/path/to/transmission-mcp-server/.env",
        "transmission-mcp-server:local"
      ]
    }
  }
}
```

`--network host` is **Linux-specific** in Docker Engine. On **Docker Desktop for Mac/Windows**, host networking behaves differently; you may need to run the MCP server **on the host** with `node dist/index.js`, or use a Linux host/VM.

## Allowlisted paths

`TRANSMISSION_ALLOWED_DOWNLOAD_DIRS` must list paths **as Transmission sees them** (usually absolute paths on the **host**). The MCP container does not need those directories mounted; validation is string-based before RPC. Torrent **data** still lands where Transmission writes it.

## Troubleshooting

- **401 / auth errors:** check `TRANSMISSION_RPC_USER` / `TRANSMISSION_RPC_PASSWORD` match Transmission’s `rpc-username` / `rpc-password`.
- **Cannot connect to RPC:** confirm host networking (Linux) and that Transmission binds to `127.0.0.1` on the expected port.
- **Client shows no tools / hung:** ensure the client started the process with an **interactive** stdin (`-i`) for stdio MCP.
