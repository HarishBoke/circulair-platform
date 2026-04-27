/**
 * Image Generation - Independent OpenAI DALL-E 3 implementation
 *
 * Primary: OpenAI DALL-E 3 (OPENAI_API_KEY)
 * Fallback: Manus Forge image service (BUILT_IN_FORGE_API_URL + BUILT_IN_FORGE_API_KEY)
 */
import OpenAI from "openai";
import { storagePut } from "server/storage";
import { ENV } from "./env";

export type GenerateImageOptions = {
  prompt: string;
  originalImages?: Array<{
    url?: string;
    b64Json?: string;
    mimeType?: string;
  }>;
};

export type GenerateImageResponse = {
  url?: string;
};

async function generateViaOpenAI(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  const client = new OpenAI({ apiKey: ENV.openaiApiKey });
  const response = await client.images.generate({
    model: ENV.openaiImageModel || "dall-e-3",
    prompt: options.prompt,
    n: 1,
    size: "1024x1024",
    response_format: "b64_json",
  });
  const b64 = (response.data ?? [])[0]?.b64_json;
  if (!b64) throw new Error("OpenAI image generation returned no image data");
  const buffer = Buffer.from(b64, "base64");
  const { url } = await storagePut(`generated/${Date.now()}.png`, buffer, "image/png");
  return { url };
}

async function generateViaForge(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  const baseUrl = ENV.forgeApiUrl.endsWith("/") ? ENV.forgeApiUrl : `${ENV.forgeApiUrl}/`;
  const fullUrl = new URL("images.v1.ImageService/GenerateImage", baseUrl).toString();
  const response = await fetch(fullUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "connect-protocol-version": "1",
      authorization: `Bearer ${ENV.forgeApiKey}`,
    },
    body: JSON.stringify({ prompt: options.prompt, original_images: options.originalImages || [] }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Forge image generation failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`);
  }
  const result = (await response.json()) as { image: { b64Json: string; mimeType: string } };
  const buffer = Buffer.from(result.image.b64Json, "base64");
  const { url } = await storagePut(`generated/${Date.now()}.png`, buffer, result.image.mimeType);
  return { url };
}

export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  if (ENV.openaiApiKey) return generateViaOpenAI(options);
  if (ENV.forgeApiUrl && ENV.forgeApiKey) return generateViaForge(options);
  throw new Error(
    "Image generation not configured: set OPENAI_API_KEY (or BUILT_IN_FORGE_API_URL + BUILT_IN_FORGE_API_KEY for Manus hosting)"
  );
}
