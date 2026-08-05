import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { uploadFileToS3 } from "../src/lib/s3Upload.js";
import fs from "fs";
import os from "os";
import path from "path";

describe("uploadFileToS3", () => {
  const keys = [
    "BACKUP_S3_BUCKET",
    "BACKUP_S3_ACCESS_KEY_ID",
    "BACKUP_S3_SECRET_ACCESS_KEY",
    "BACKUP_S3_REGION",
    "BACKUP_S3_ENDPOINT",
    "BACKUP_S3_PREFIX",
  ];
  const saved = {};

  afterEach(() => {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
      delete saved[k];
    }
  });

  function stashEnv() {
    for (const k of keys) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  }

  it("no-op sem BACKUP_S3_BUCKET", async () => {
    stashEnv();
    const result = await uploadFileToS3("/tmp/x", "x.dump");
    assert.equal(result.uploaded, false);
    assert.match(result.reason, /BACKUP_S3_BUCKET/);
  });

  it("no-op sem credenciais", async () => {
    stashEnv();
    process.env.BACKUP_S3_BUCKET = "my-bucket";
    const result = await uploadFileToS3("/tmp/x", "x.dump");
    assert.equal(result.uploaded, false);
    assert.match(result.reason, /Credenciais/);
  });

  it("falha com credenciais inválidas (erro de rede/HTTP)", async () => {
    stashEnv();
    process.env.BACKUP_S3_BUCKET = "bucket-inexistente-test";
    process.env.BACKUP_S3_ACCESS_KEY_ID = "AKIAINVALID";
    process.env.BACKUP_S3_SECRET_ACCESS_KEY = "secretinvalid";
    process.env.BACKUP_S3_REGION = "us-east-1";

    const tmp = path.join(os.tmpdir(), `benny-backup-test-${Date.now()}.txt`);
    fs.writeFileSync(tmp, "backup-test");
    try {
      await assert.rejects(
        () => uploadFileToS3(tmp, path.basename(tmp)),
        /Upload S3 falhou|fetch|ENOTFOUND|ECONNREFUSED|403|400|404/i,
      );
    } finally {
      try {
        fs.unlinkSync(tmp);
      } catch {
        /* ignore */
      }
    }
  });
});
