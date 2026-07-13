/**
 * Image Generation - Independent OpenAI DALL-E 3 implementation
 *
 * Primary: OpenAI DALL-E 3 (OPENAI_API_KEY)
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

export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  if (!ENV.openaiApiKey) {
    throw new Error(
      "Image generation not configured: set OPENAI_API_KEY in your environment variables"
    );
  }
  return generateViaOpenAI(options);
}
