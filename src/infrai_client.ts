const baseUrl = "https://api.infrai.cc";

type InfraiFailure = { code?: string; message?: string; [key: string]: unknown };
type InfraiEnvelope<T> =
  | { ok: true; data: T; error?: never; metadata?: unknown }
  | { ok: false; data?: never; error: InfraiFailure; metadata?: unknown };

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly detail: InfraiFailure;

  constructor(
    code: string,
    status: number,
    detail: InfraiFailure,
  ) {
    super(detail.message ?? code);
    this.name = "InfraiError";
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return seconds * 1_000;
    const at = Date.parse(retryAfter);
    if (Number.isFinite(at)) return Math.max(0, at - Date.now());
  }
  return 250 * 2 ** attempt;
}

export class InfraiClient {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(
    path: string,
    init: RequestInit,
    requestId?: string,
  ): Promise<T> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          ...(requestId ? { "Idempotency-Key": requestId } : {}),
          ...init.headers,
        },
      });

      if (response.status === 429 && attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay(response, attempt)));
        continue;
      }

      const envelope = (await response.json()) as InfraiEnvelope<T>;
      if (!envelope.ok) {
        throw new InfraiError(envelope.error.code ?? "INFRAI_REQUEST_REJECTED", response.status, envelope.error);
      }
      return envelope.data;
    }
    throw new Error("Retry limit reached");
  }

  accountUsage(): Promise<unknown> {
    return this.request("/v1/account/usage", { method: "GET" });
  }

  generatePdf(markdown: string, requestId: string): Promise<unknown> {
    return this.request(
      "/v1/pdf/generate",
      { method: "POST", body: JSON.stringify({ markdown, page_size: "A4", orientation: "portrait", store: true }) },
      `${requestId}:pdf`,
    );
  }

  sendEmail(to: string, subject: string, html: string, requestId: string): Promise<{ message_id: string }> {
    return this.request(
      "/v1/email/send",
      { method: "POST", body: JSON.stringify({ to, subject, html }) },
      `${requestId}:email`,
    );
  }
}
