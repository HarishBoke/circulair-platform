/**
 * File Storage - Independent AWS S3 implementation
 *
 * Primary: AWS S3 SDK (AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY + AWS_S3_BUCKET + AWS_REGION)
 * Fallback: Manus Forge storage proxy (BUILT_IN_FORGE_API_URL + BUILT_IN_FORGE_API_KEY)
 *           — used automatically when deployed on Manus hosting without AWS credentials
 *
 * The S3 bucket should be configured with public-read ACL or a CloudFront distribution
 * so returned URLs are directly accessible without presigning.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./_core/env";

// ── AWS S3 implementation ─────────────────────────────────────────────────────

function getS3Client(): S3Client {
  return new S3Client({
    region: ENV.awsRegion || "us-east-1",
    credentials: {
      accessKeyId: ENV.awsAccessKeyId,
      secretAccessKey: ENV.awsSecretAccessKey,
    },
  });
}

async function s3Put(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType: string
): Promise<{ key: string; url: string }> {
  const client = getS3Client();
  const bucket = ENV.awsS3Bucket;
  const key = relKey.replace(/^\/+/, "");

  const body = typeof data === "string" ? Buffer.from(data) : data;

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  // Return a public URL — assumes bucket has public-read or CloudFront CDN
  const region = ENV.awsRegion || "us-east-1";
  const url =
    region === "us-east-1"
      ? `https://${bucket}.s3.amazonaws.com/${key}`
      : `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

  return { key, url };
}

async function s3Get(
  relKey: string,
  expiresIn = 3600
): Promise<{ key: string; url: string }> {
  const client = getS3Client();
  const bucket = ENV.awsS3Bucket;
  const key = relKey.replace(/^\/+/, "");

  const url = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn }
  );

  return { key, url };
}

// ── Manus Forge proxy fallback ────────────────────────────────────────────────

function getForgeConfig(): { baseUrl: string; apiKey: string } {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;
  if (!baseUrl || !apiKey) {
    throw new Error(
      "Storage not configured: set AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY + AWS_S3_BUCKET (or BUILT_IN_FORGE_API_URL + BUILT_IN_FORGE_API_KEY for Manus hosting)"
    );
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

async function forgePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType: string
): Promise<{ key: string; url: string }> {
  const { baseUrl, apiKey } = getForgeConfig();
  const key = relKey.replace(/^\/+/, "");
  const uploadUrl = new URL("v1/storage/upload", `${baseUrl}/`);
  uploadUrl.searchParams.set("path", key);

  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as unknown as BlobPart], { type: contentType });
  const form = new FormData();
  form.append("file", blob, key.split("/").pop() ?? key);

  const response = await fetch(uploadUrl.toString(), {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!response.ok) {
    const msg = await response.text().catch(() => response.statusText);
    throw new Error(`Forge storage upload failed (${response.status}): ${msg}`);
  }
  const url = (await response.json()).url;
  return { key, url };
}

async function forgeGet(relKey: string): Promise<{ key: string; url: string }> {
  const { baseUrl, apiKey } = getForgeConfig();
  const key = relKey.replace(/^\/+/, "");
  const downloadApiUrl = new URL("v1/storage/downloadUrl", `${baseUrl}/`);
  downloadApiUrl.searchParams.set("path", key);
  const response = await fetch(downloadApiUrl.toString(), {
    method: "GET",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const url = (await response.json()).url;
  return { key, url };
}

// ── Public API ────────────────────────────────────────────────────────────────

function hasAwsCredentials(): boolean {
  return !!(ENV.awsAccessKeyId && ENV.awsSecretAccessKey && ENV.awsS3Bucket);
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  if (hasAwsCredentials()) return s3Put(relKey, data, contentType);
  return forgePut(relKey, data, contentType);
}

export async function storageGet(
  relKey: string,
  expiresIn = 3600
): Promise<{ key: string; url: string }> {
  if (hasAwsCredentials()) return s3Get(relKey, expiresIn);
  return forgeGet(relKey);
}
