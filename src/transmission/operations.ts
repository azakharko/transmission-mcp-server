import type { TransmissionRpcClient } from "./rpcClient.js";

export const LIST_TORRENT_FIELDS = [
  "id",
  "name",
  "status",
  "percentDone",
  "rateDownload",
  "rateUpload",
  "totalSize",
  "sizeWhenDone",
  "downloadDir",
  "error",
  "errorString",
  "eta",
  "uploadedEver",
  "addedDate",
  "doneDate",
] as const;

export async function listTorrents(client: TransmissionRpcClient) {
  return client.call<{ torrents: Record<string, unknown>[] }>("torrent-get", {
    fields: [...LIST_TORRENT_FIELDS],
  });
}

export async function addTorrent(
  client: TransmissionRpcClient,
  filename: string,
  downloadDir: string,
) {
  return client.call<{
    "torrent-added"?: Record<string, unknown>;
    "torrent-duplicate"?: Record<string, unknown>;
  }>("torrent-add", {
    filename,
    "download-dir": downloadDir,
  });
}

export async function startTorrent(client: TransmissionRpcClient, id: number) {
  return client.call<Record<string, never>>("torrent-start", { ids: [id] });
}

export async function stopTorrent(client: TransmissionRpcClient, id: number) {
  return client.call<Record<string, never>>("torrent-stop", { ids: [id] });
}

export async function removeTorrent(
  client: TransmissionRpcClient,
  id: number,
  deleteLocalData: boolean,
) {
  return client.call<Record<string, never>>("torrent-remove", {
    ids: [id],
    "delete-local-data": deleteLocalData,
  });
}

export async function getSession(client: TransmissionRpcClient) {
  return client.call<Record<string, unknown>>("session-get", {});
}
