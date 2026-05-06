# Architecture

This project implements an MCP **stdio** server that maps a small, fixed tool surface to Transmission’s **JSON-RPC over HTTP** API.

## Component diagram

```mermaid
flowchart TB
  subgraph process [Node_process]
    index[index.ts]
    tools[mcp/tools.ts]
    ops[transmission/operations.ts]
    rpc[transmission/rpcClient.ts]
    val[validators]
    log[log/mutationLog.ts]
    index --> tools
    tools --> ops
    tools --> val
    tools --> log
    ops --> rpc
  end
  subgraph io [IO]
    stdin[stdin_MCP_JSON_RPC]
    stdout[stdout_MCP_JSON_RPC]
    stderr[stderr_logs_and_warnings]
  end
  subgraph remote [Transmission]
    rpcHttp[HTTP_POST_transmission_rpc]
  end
  index --> stdin
  index --> stdout
  tools --> stderr
  rpc --> rpcHttp
```

## Request sequence (example: add torrent)

```mermaid
sequenceDiagram
  participant MCP as MCP_client
  participant S as transmission_mcp_server
  participant T as Transmission_RPC
  MCP->>S: tools/call transmission_add_torrent
  S->>S: assertValidTorrentSource
  S->>S: resolveEffectiveDownloadDir_allowlist
  S->>S: logMutation_stderr_JSONL
  S->>T: POST torrent_add_filename_download_dir
  T-->>S: JSON success_or_error
  S-->>MCP: CallToolResult_text_JSON
```

## RPC client behavior

- Sends `Authorization: Basic …` on every request.
- Captures `X-Transmission-Session-Id` from a **409** response and retries once (Transmission standard behavior).
- Surfaces HTTP **401** and RPC **`result: "error"`** as tool-visible failures.

## Read vs write tools

- **Read:** `transmission_list_torrents`, `transmission_get_session` (no mutation log line).
- **Write:** `transmission_add_torrent`, `transmission_start_torrent`, `transmission_stop_torrent`, `transmission_remove_torrent` (each emits a **mutation** log line on stderr when invoked, success or failure).
