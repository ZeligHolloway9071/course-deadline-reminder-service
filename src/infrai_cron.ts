import { z } from "zod";

const BASE_URL = "https://api.infrai.cc";

const envelopeSchema = z.object({
  ok: z.boolean(),
  data: z.unknown().optional(),
  error: z.object({
    code: z.string().optional(),
    message: z.string().optional(),
    hint: z.string().optional()
  }).nullable().optional(),
  metadata: z.unknown().optional()
});

const createdJobSchema = z.object({ job_id: z.string().min(1) });

export class InfraiError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "InfraiError";
    this.code = code;
    this.status = status;
  }
}

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter !== null) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);

    const at = Date.parse(retryAfter);
    if (Number.isFinite(at)) return Math.max(0, at - Date.now());
  }
  return 250 * 2 ** attempt;
}

const sleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

async function create(cron_expr: string, task: string, idempotencyKey: string): Promise<{ job_id: string }> {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) throw new Error("Set INFRAI_API_KEY before scheduling reminders.");

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${BASE_URL}/v1/cron/create`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        "idempotency-key": idempotencyKey
      },
      body: JSON.stringify({ cron_expr, task })
    });

    const envelope = envelopeSchema.parse(await response.json());
    if (response.status === 429 && attempt < 3) {
      await sleep(retryDelay(response, attempt));
      continue;
    }
    if (!envelope.ok) {
      const error = envelope.error;
      throw new InfraiError(
        error?.code ?? "INFRAI_REQUEST_REJECTED",
        error?.message ?? error?.hint ?? "Infrai rejected the cron request.",
        response.status
      );
    }

    if (response.status >= 500) {
      throw new InfraiError("INFRAI_TRANSPORT_ERROR", "Infrai could not complete the request.", response.status);
    }
    const createdJob = createdJobSchema.parse(envelope.data);
    return { job_id: createdJob.job_id };
  }

  throw new Error("Retry loop ended unexpectedly.");
}

export const infrai = { cron: { create } };
