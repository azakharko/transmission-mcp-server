export type MutationAction = "add_torrent" | "start" | "stop" | "remove";

export type MutationLogPayload = Record<string, unknown>;

export function logMutation(action: MutationAction, payload: MutationLogPayload): void {
  const line = JSON.stringify({
    type: "transmission_mcp_mutation",
    ts: new Date().toISOString(),
    action,
    ...payload,
  });
  console.error(line);
}
