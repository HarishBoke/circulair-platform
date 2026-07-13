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

// ── Public API ────────────────────────────────────────────────────────────────

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  if (!ENV.awsAccessKeyId || !ENV.awsSecretAccessKey || !ENV.awsS3Bucket) {
    throw new Error(
      "Storage not configured: set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET in your environment variables"
    );
  }
  return s3Put(relKey, data, contentType);
}

export async function storageGet(
  relKey: string,
  expiresIn = 3600
): Promise<{ key: string; url: string }> {
  if (!ENV.awsAccessKeyId || !ENV.awsSecretAccessKey || !ENV.awsS3Bucket) {
    throw new Error(
      "Storage not configured: set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET in your environment variables"
    );
  }
  return s3Get(relKey, expiresIn);
}
