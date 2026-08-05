import { createHmac, createHash } from "crypto";
import fs from "fs";

function hmac(key, msg) {
  return createHmac("sha256", key).update(msg, "utf8").digest();
}

function sha256Hex(data) {
  return createHash("sha256").update(data).digest("hex");
}

/**
 * Upload opcional para S3-compatible (AWS, R2, B2, MinIO).
 * No-op se BACKUP_S3_BUCKET ou credenciais não estiverem configurados.
 */
export async function uploadFileToS3(filePath, objectName) {
  const bucket = (process.env.BACKUP_S3_BUCKET || "").trim();
  if (!bucket) {
    return { uploaded: false, reason: "BACKUP_S3_BUCKET não configurado" };
  }

  const accessKey = (process.env.BACKUP_S3_ACCESS_KEY_ID || "").trim();
  const secretKey = (process.env.BACKUP_S3_SECRET_ACCESS_KEY || "").trim();
  if (!accessKey || !secretKey) {
    return { uploaded: false, reason: "Credenciais S3 ausentes" };
  }

  const region = (process.env.BACKUP_S3_REGION || "us-east-1").trim();
  const endpoint =
    (process.env.BACKUP_S3_ENDPOINT || "").trim() ||
    `https://s3.${region}.amazonaws.com`;
  const prefix = process.env.BACKUP_S3_PREFIX || "backups/";
  const key = `${prefix.replace(/\/?$/, "/")}${objectName}`.replace(
    /^\/+/,
    "",
  );

  const body = fs.readFileSync(filePath);
  const url = new URL(endpoint);
  const host = url.host;
  const pathStyle = Boolean(process.env.BACKUP_S3_ENDPOINT);
  const canonicalUri = pathStyle
    ? `/${bucket}/${key}`
    : `/${key}`;
  const putUrl = pathStyle
    ? `${endpoint.replace(/\/$/, "")}/${bucket}/${key}`
    : `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(body);

  const canonicalHeaders = `host:${pathStyle ? host : `${bucket}.s3.${region}.amazonaws.com`}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    "PUT",
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const kDate = hmac(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, "s3");
  const kSigning = hmac(kService, "aws4_request");
  const signature = createHmac("sha256", kSigning)
    .update(stringToSign, "utf8")
    .digest("hex");

  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const requestHost = pathStyle
    ? host
    : `${bucket}.s3.${region}.amazonaws.com`;

  const res = await fetch(putUrl, {
    method: "PUT",
    headers: {
      Host: requestHost,
      "x-amz-date": amzDate,
      "x-amz-content-sha256": payloadHash,
      Authorization: authorization,
      "Content-Length": String(body.length),
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Upload S3 falhou: ${res.status} ${text.slice(0, 300)}`);
  }

  return { uploaded: true, key, bucket };
}
