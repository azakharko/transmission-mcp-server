import { z } from "zod";

const torrentRefSchema = z
  .object({
    id: z.number().int().positive().optional(),
    name: z.string().optional(),
    hashString: z.string().optional(),
  })
  .passthrough();

const addTorrentArgumentsSchema = z
  .object({
    "torrent-added": torrentRefSchema.optional(),
    "torrent-duplicate": torrentRefSchema.optional(),
  })
  .passthrough();

export type AddTorrentRpcArguments = z.infer<typeof addTorrentArgumentsSchema>;

export function parseAddTorrentArguments(raw: unknown):
  | { ok: true; value: AddTorrentRpcArguments }
  | { ok: false; message: string } {
  const r = addTorrentArgumentsSchema.safeParse(raw);
  if (!r.success) {
    return { ok: false, message: r.error.flatten().formErrors.join("; ") || r.error.message };
  }
  return { ok: true, value: r.data };
}

export function getTorrentIdFromAddResult(parsed: AddTorrentRpcArguments): number | undefined {
  const added = parsed["torrent-added"]?.["id"];
  const dup = parsed["torrent-duplicate"]?.["id"];
  const id = added ?? dup;
  return typeof id === "number" ? id : undefined;
}
