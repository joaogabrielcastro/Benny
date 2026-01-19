import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const PROVIDER = process.env.STORAGE_PROVIDER || "local"; // 'local' or 's3'

// S3 lazy import to avoid requiring SDK when not needed
let S3Client, PutObjectCommand;
if (PROVIDER === "s3") {
  // dynamic import
  ({ S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3"));
}

async function saveBase64File(base64, filename) {
  if (!base64) return null;

  if (PROVIDER === "s3") {
    const bucket = process.env.AWS_S3_BUCKET;
    if (!bucket) throw new Error("AWS_S3_BUCKET not configured for S3 storage");

    const client = new S3Client({ region: process.env.AWS_REGION });
    const buffer = Buffer.from(base64, "base64");

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: filename,
      Body: buffer,
      ContentType: "application/octet-stream",
    });

    await client.send(command);
    // Return S3 key as path
    return `s3://${bucket}/${filename}`;
  }

  // local storage
  const storageDir = path.resolve(process.cwd(), "backend", "storage");
  if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });

  const filePath = path.join(storageDir, filename);
  fs.writeFileSync(filePath, Buffer.from(base64, "base64"));

  // return relative path used in DB
  return `storage/${filename}`;
}

export { saveBase64File };
