import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

/** User-facing copy when primary + fallback AI both fail. */
export const AI_BUSY_USER_MESSAGE =
  "Our AI is temporarily busy. Please try again in a moment.";

function getAnthropic(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });
}

function getOpenAI(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" });
}

function firstAnthropicText(content: Anthropic.Message["content"]): string {
  for (const block of content) {
    if (block.type === "text") return block.text;
  }
  return "";
}

function isRetryableAnthropicError(error: unknown): boolean {
  const e = error as { status?: number; error?: { type?: string } };
  if (e?.status === 529) return true;
  if (e?.error?.type === "overloaded_error") return true;
  if (e?.status === 503 || e?.status === 429) return true;
  return false;
}

export function hasAiProviderConfigured(): boolean {
  return Boolean(
    (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim()) ||
      (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim())
  );
}

/**
 * Non-streaming completion: Claude (with retries on overload) then GPT-4o fallback.
 */
export async function aiComplete(params: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<string> {
  const maxTokens = params.maxTokens ?? 1500;
  const anthropic = getAnthropic();
  const openai = getOpenAI();

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: maxTokens,
        system: params.system,
        messages: [{ role: "user", content: params.user }],
      });
      return firstAnthropicText(response.content);
    } catch (error: unknown) {
      if (isRetryableAnthropicError(error) && attempt < 2) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      try {
        const fallback = await openai.chat.completions.create({
          model: "gpt-4o",
          max_tokens: maxTokens,
          messages: [
            { role: "system", content: params.system },
            { role: "user", content: params.user },
          ],
        });
        const t = fallback.choices[0]?.message?.content?.trim() ?? "";
        if (!t) throw new Error(AI_BUSY_USER_MESSAGE);
        return t;
      } catch {
        throw new Error(AI_BUSY_USER_MESSAGE);
      }
    }
  }
  throw new Error(AI_BUSY_USER_MESSAGE);
}

/**
 * Multi-turn non-streaming completion (e.g. Sales Builder chat).
 */
export async function aiCompleteMessages(params: {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens?: number;
}): Promise<string> {
  const maxTokens = params.maxTokens ?? 1500;
  const anthropic = getAnthropic();
  const openai = getOpenAI();

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: maxTokens,
        system: params.system,
        messages: params.messages,
      });
      return firstAnthropicText(response.content);
    } catch (error: unknown) {
      if (isRetryableAnthropicError(error) && attempt < 2) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      try {
        const fallback = await openai.chat.completions.create({
          model: "gpt-4o",
          max_tokens: maxTokens,
          messages: [{ role: "system", content: params.system }, ...params.messages],
        });
        const t = fallback.choices[0]?.message?.content?.trim() ?? "";
        if (!t) throw new Error(AI_BUSY_USER_MESSAGE);
        return t;
      } catch {
        throw new Error(AI_BUSY_USER_MESSAGE);
      }
    }
  }
  throw new Error(AI_BUSY_USER_MESSAGE);
}
