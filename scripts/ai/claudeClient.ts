import 'dotenv/config';
// Small server-side wrapper for Anthropic/Claude calls.
// This file is meant to run locally (devtools) and never be imported in frontend code.

let Anthropic: any;
try {
  // Try to import the official SDK; if it's not installed the error will be caught
  // and a helpful message will be shown when the CLI is invoked.
  // Install with: `npm install anthropic`
  // The runtime used in this repo supports ESM; `anthropic` commonly exports `Anthropic` or default.
  // Using dynamic import keeps startup errors local to devtools.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Anthropic = (await import('anthropic')).Anthropic ?? (await import('anthropic')).default;
} catch (e) {
  // leave Anthropic undefined; callers will see a helpful error
}

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  // Do not throw at import time to allow CI/linting to run; functions will check before use.
}

export function ensureClient() {
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set. Add it to a local .env or your environment.');
  }
  if (!Anthropic) {
    throw new Error('The `anthropic` package is not installed. Run `npm install anthropic` in the repository root.');
  }
  // Create client per-call to avoid cross-run state issues in short-lived scripts.
  // SDK constructors vary; this attempts the common shape.
  try {
    return new Anthropic({ apiKey });
  } catch (err) {
    // Fallback for different SDK shapes
    return new (Anthropic as any)(apiKey);
  }
}

export async function askClaude(prompt: string, options: { max_tokens?: number; temperature?: number; model?: string } = {}) {
  const client = ensureClient();
  // Default to a code-specialized Claude model when using this dev tooling.
  // You can override with the `model` option (e.g., 'claude-2.1' or other available names).
  const model = options.model ?? 'claude-code-2';
  // Call the typical completions API shape used by many SDKs.
  const params: any = {
    model,
    prompt,
    max_tokens: options.max_tokens ?? 512,
    temperature: options.temperature ?? 0.2,
  };

  const resp: any = await client.completions.create(params);

  // Try common response fields used by different SDK versions.
  if (!resp) return '';
  if (typeof resp === 'string') return resp;
  if (resp.completion) return resp.completion;
  if (resp.output_text) return resp.output_text;
  if (resp.text) return resp.text;
  // If none match, return a compact JSON string.
  return JSON.stringify(resp);
}
