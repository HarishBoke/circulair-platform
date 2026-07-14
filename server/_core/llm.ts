/**
 * LLM Integration - Independent OpenAI implementation
 *
 * Primary: OpenAI API (OPENAI_API_KEY) using gpt-4o

 *           — used automatically when deployed on Manus hosting without OpenAI key
 */

import OpenAI from "openai";
import { ENV } from "./env";

// ── Type Definitions ──────────────────────────────────────────────────────────

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4";
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: { name: string };
};
export type ToolChoice = ToolChoicePrimitive | ToolChoiceByName | ToolChoiceExplicit;

export type OutputSchema = {
  name: string;
  strict?: boolean;
  schema: Record<string, unknown>;
};

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: OutputSchema };

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type InvokeResult = {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string | null;
      tool_calls?: ToolCall[];
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

// ── Client factory ────────────────────────────────────────────────────────────

function getOpenAIClient(): OpenAI {
  if (ENV.openaiApiKey) {
    return new OpenAI({ apiKey: ENV.openaiApiKey });
  }
  throw new Error(
    "LLM not configured: set OPENAI_API_KEY in your environment variables"
  );
}

// ── Message normalisation ─────────────────────────────────────────────────────

function normalizeContent(
  content: MessageContent | MessageContent[]
): string | OpenAI.Chat.ChatCompletionContentPart[] {
  if (typeof content === "string") return content;
  const parts = Array.isArray(content) ? content : [content];
  return parts.map((part): OpenAI.Chat.ChatCompletionContentPart => {
    if (typeof part === "string") return { type: "text", text: part };
    if (part.type === "text") return { type: "text", text: part.text };
    if (part.type === "image_url") {
      return {
        type: "image_url",
        image_url: { url: part.image_url.url, detail: part.image_url.detail },
      };
    }
    // file_url — represent as text description for models that don't support it
    return { type: "text", text: `[File: ${(part as FileContent).file_url.url}]` };
  });
}

function normalizeMessages(
  messages: Message[]
): OpenAI.Chat.ChatCompletionMessageParam[] {
  return messages.map((m) => ({
    role: m.role as OpenAI.Chat.ChatCompletionMessageParam["role"],
    content: normalizeContent(m.content),
    ...(m.name ? { name: m.name } : {}),
    ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
  })) as OpenAI.Chat.ChatCompletionMessageParam[];
}

function normalizeToolChoice(
  choice: ToolChoice | undefined,
  tools: Tool[] | undefined
): OpenAI.Chat.ChatCompletionToolChoiceOption | undefined {
  if (!choice || !tools?.length) return undefined;
  if (typeof choice === "string") return choice as OpenAI.Chat.ChatCompletionToolChoiceOption;
  if ("name" in choice) return { type: "function", function: { name: choice.name } };
  return choice as OpenAI.Chat.ChatCompletionToolChoiceOption;
}

// ── Main invokeLLM ────────────────────────────────────────────────────────────

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const client = getOpenAIClient();
  const model = ENV.openaiModel || "gpt-4o";

  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    maxTokens,
    max_tokens,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
  } = params;

  const schema = outputSchema ?? output_schema;
  const fmt = responseFormat ?? response_format;

  // Build response_format
  let resolvedFormat: OpenAI.Chat.ChatCompletionCreateParams["response_format"] | undefined;
  if (schema) {
    resolvedFormat = {
      type: "json_schema",
      json_schema: {
        name: schema.name,
        strict: schema.strict ?? true,
        schema: schema.schema,
      },
    };
  } else if (fmt) {
    resolvedFormat = fmt as OpenAI.Chat.ChatCompletionCreateParams["response_format"];
  }

  const requestParams: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
    model,
    messages: normalizeMessages(messages),
    max_tokens: maxTokens ?? max_tokens ?? 4096,
    ...(tools?.length ? { tools: tools as OpenAI.Chat.ChatCompletionTool[] } : {}),
    ...(normalizeToolChoice(toolChoice ?? tool_choice, tools)
      ? { tool_choice: normalizeToolChoice(toolChoice ?? tool_choice, tools) }
      : {}),
    ...(resolvedFormat ? { response_format: resolvedFormat } : {}),
  };

  const response = await client.chat.completions.create(requestParams);

  // Return in the same shape as before so all callers remain unchanged
  return response as unknown as InvokeResult;
}
