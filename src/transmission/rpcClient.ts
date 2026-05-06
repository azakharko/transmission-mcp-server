export class TransmissionRpcError extends Error {
  readonly httpStatus: number;
  readonly rpcMessage: string | undefined;

  constructor(message: string, httpStatus: number, rpcMessage?: string) {
    super(message);
    this.name = "TransmissionRpcError";
    this.httpStatus = httpStatus;
    this.rpcMessage = rpcMessage;
  }
}

export type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

export class TransmissionRpcClient {
  private sessionId: string | null = null;
  private tag = 0;
  private readonly fetchFn: FetchLike;

  constructor(
    private readonly options: {
      rpcUrl: string;
      rpcUser: string;
      rpcPassword: string;
    },
    fetchFn: FetchLike,
  ) {
    this.fetchFn = fetchFn;
  }

  private authHeader(): string {
    const token = Buffer.from(
      `${this.options.rpcUser}:${this.options.rpcPassword}`,
      "utf8",
    ).toString("base64");
    return `Basic ${token}`;
  }

  async call<TArguments>(
    method: string,
    args: Record<string, unknown>,
  ): Promise<TArguments> {
    const body = { method, arguments: args, tag: ++this.tag };
    const attempt = async (): Promise<{ res: Response; json: unknown }> => {
      const headers = new Headers({
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: this.authHeader(),
      });
      if (this.sessionId) {
        headers.set("X-Transmission-Session-Id", this.sessionId);
      }

      const res = await this.fetchFn(this.options.rpcUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      const json: unknown = await res.json().catch(() => null);
      return { res, json };
    };

    let { res, json } = await attempt();

    if (res.status === 409) {
      const sid = res.headers.get("X-Transmission-Session-Id");
      if (!sid) {
        throw new TransmissionRpcError(
          "Transmission returned 409 without X-Transmission-Session-Id",
          409,
        );
      }
      this.sessionId = sid;
      ({ res, json } = await attempt());
    }

    if (res.status === 401) {
      throw new TransmissionRpcError("Transmission RPC authentication failed", 401);
    }

    if (!res.ok) {
      throw new TransmissionRpcError(
        `Transmission RPC HTTP ${String(res.status)}`,
        res.status,
      );
    }

    if (json === null || typeof json !== "object") {
      throw new TransmissionRpcError(
        "Invalid Transmission RPC JSON body",
        res.status,
      );
    }

    const rec = json as Record<string, unknown>;
    const result = rec["result"];
    if (result === "error") {
      const msg = typeof rec["arguments"] === "string" ? rec["arguments"] : "unknown error";
      throw new TransmissionRpcError(`Transmission RPC error: ${msg}`, res.status, msg);
    }
    if (result !== "success") {
      throw new TransmissionRpcError("Unexpected Transmission RPC result", res.status);
    }
    return rec["arguments"] as TArguments;
  }
}
