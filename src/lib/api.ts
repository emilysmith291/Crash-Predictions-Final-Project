// The live Modal API. NEXT_PUBLIC_API_URL is set in Vercel's environment
// variables; the fallback is the same deployed URL, never localhost.
export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "https://emilysmith291--crash-severity-api-web.us-east.modal.run"
).replace(/\/$/, "");

// The API scales to zero, so the first request after an idle period has to
// start a container. Allow plenty of time before calling it a failure.
const TIMEOUT_MS = 90_000;

export type CrashInput = Record<string, string | number | null>;

export type Prediction = {
  severe_probability: number;
  base_rate: number;
  nhtsa_input: Record<string, unknown>;
};

export type Options = {
  choice_fields: Record<string, { options: string[]; default: string | null }>;
  makes: string[];
};

export type FieldError = { field: string; message: string };

export class ApiError extends Error {
  kind: "network" | "timeout" | "validation" | "unavailable" | "server";
  status?: number;
  fieldErrors: FieldError[];

  constructor(kind: ApiError["kind"], message: string, status?: number, fieldErrors: FieldError[] = []) {
    super(message);
    this.kind = kind;
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

function parseValidation(detail: unknown): FieldError[] {
  if (typeof detail === "string") return [{ field: "", message: detail }];
  if (Array.isArray(detail)) {
    return detail.map((d: { loc?: unknown[]; msg?: string }) => ({
      field: String(d.loc?.at(-1) ?? ""),
      message: d.msg ?? "Invalid value",
    }));
  }
  return [{ field: "", message: "Invalid input" }];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new ApiError("timeout", "The model API took too long to respond.");
    }
    throw new ApiError("network", "Couldn't reach the model API. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }

  if (res.ok) return res.json() as Promise<T>;

  const body = await res.json().catch(() => null);
  if (res.status === 422) {
    throw new ApiError("validation", "Some inputs aren't valid.", 422, parseValidation(body?.detail));
  }
  if (res.status === 503) {
    throw new ApiError("unavailable", "The model is temporarily unavailable. Try again in a minute.", 503);
  }
  throw new ApiError("server", `The API returned an error (${res.status}).`, res.status);
}

export const getHealth = () => request<{ status: string }>("/health");
export const getOptions = () => request<Options>("/options");
export const predict = (input: CrashInput) =>
  request<Prediction>("/predict", { method: "POST", body: JSON.stringify(input) });
