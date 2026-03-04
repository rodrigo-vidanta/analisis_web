import { S3Client, PutObjectCommand, GetObjectCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { createHmac } from "crypto";

const s3 = new S3Client({ region: process.env.S3_REGION });
const sm = new SecretsManagerClient({ region: process.env.S3_REGION });

let cachedSecret = null;

async function getSecret() {
  if (cachedSecret) return cachedSecret;
  const res = await sm.send(new GetSecretValueCommand({ SecretId: process.env.SECRET_NAME }));
  cachedSecret = JSON.parse(res.SecretString);
  return cachedSecret;
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return Buffer.from(str, "base64");
}

function verifyJWT(token, secret) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid token format");
  const header = JSON.parse(base64UrlDecode(parts[0]).toString());
  const payload = JSON.parse(base64UrlDecode(parts[1]).toString());
  if (header.alg !== "HS256") throw new Error("Unsupported algorithm");
  const signature = createHmac("sha256", secret)
    .update(parts[0] + "." + parts[1])
    .digest("base64url");
  if (signature !== parts[2]) throw new Error("Invalid signature");
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) throw new Error("Token expired");
  return payload;
}

function cors(body, statusCode = 200) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGINS || "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type, X-File-Name, X-File-Type",
    },
    body: JSON.stringify(body),
  };
}

export const handler = async (event) => {
  if (event.requestContext?.http?.method === "OPTIONS") {
    return cors({ ok: true });
  }
  const authHeader = event.headers?.authorization || event.headers?.Authorization || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return cors({ error: "Missing Authorization header" }, 401);
  let payload;
  try {
    const secret = await getSecret();
    payload = verifyJWT(token, secret.jwt_secret);
    if (!secret.allowed_roles.includes(payload.role)) {
      return cors({ error: "Insufficient role" }, 403);
    }
  } catch (err) {
    return cors({ error: "Invalid or expired token", detail: err.message }, 401);
  }
  const method = event.requestContext?.http?.method;
  const path = event.rawPath || "";
  const bucket = process.env.S3_BUCKET;
  try {
    if (method === "POST" && path === "/upload") {
      const body = JSON.parse(event.body || "{}");
      const { fileName, fileType, folder = "media" } = body;
      if (!fileName || !fileType) return cors({ error: "fileName and fileType required" }, 400);
      const date = new Date();
      const key = `${folder}/${date.getFullYear()}/${String(date.getMonth()+1).padStart(2,"0")}/${String(date.getDate()).padStart(2,"0")}/${crypto.randomUUID()}-${fileName}`;
      const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: fileType });
      const presignedUrl = await getSignedUrl(s3, command, { expiresIn: parseInt(process.env.PRESIGNED_EXPIRY_UPLOAD) });
      return cors({ presignedUrl, key, expiresIn: parseInt(process.env.PRESIGNED_EXPIRY_UPLOAD), method: "PUT" });
    }
    if (method === "POST" && path === "/upload/multipart/init") {
      const body = JSON.parse(event.body || "{}");
      const { fileName, fileType, folder = "video", parts = 100 } = body;
      if (!fileName || !fileType) return cors({ error: "fileName and fileType required" }, 400);
      const date = new Date();
      const key = `${folder}/${date.getFullYear()}/${String(date.getMonth()+1).padStart(2,"0")}/${String(date.getDate()).padStart(2,"0")}/${crypto.randomUUID()}-${fileName}`;
      const { UploadId } = await s3.send(new CreateMultipartUploadCommand({ Bucket: bucket, Key: key, ContentType: fileType }));
      const presignedUrls = [];
      for (let i = 1; i <= parts; i++) {
        const command = new UploadPartCommand({ Bucket: bucket, Key: key, UploadId, PartNumber: i });
        const url = await getSignedUrl(s3, command, { expiresIn: parseInt(process.env.PRESIGNED_EXPIRY_UPLOAD) });
        presignedUrls.push({ partNumber: i, url });
      }
      return cors({ uploadId: UploadId, key, presignedUrls });
    }
    if (method === "POST" && path === "/upload/multipart/complete") {
      const body = JSON.parse(event.body || "{}");
      const { key, uploadId, parts } = body;
      if (!key || !uploadId || !parts) return cors({ error: "key, uploadId, and parts required" }, 400);
      await s3.send(new CompleteMultipartUploadCommand({
        Bucket: bucket, Key: key, UploadId: uploadId,
        MultipartUpload: { Parts: parts.map(p => ({ PartNumber: p.partNumber, ETag: p.etag })) }
      }));
      return cors({ key, status: "completed" });
    }
    if (method === "GET" && path === "/download") {
      const key = event.queryStringParameters?.key;
      if (!key) return cors({ error: "key parameter required" }, 400);
      const command = new GetObjectCommand({ Bucket: bucket, Key: key });
      const presignedUrl = await getSignedUrl(s3, command, { expiresIn: parseInt(process.env.PRESIGNED_EXPIRY_DOWNLOAD) });
      return cors({ presignedUrl, expiresIn: parseInt(process.env.PRESIGNED_EXPIRY_DOWNLOAD) });
    }
    return cors({ error: "Not found", endpoints: ["POST /upload", "POST /upload/multipart/init", "POST /upload/multipart/complete", "GET /download?key="] }, 404);
  } catch (err) {
    console.error("Error:", err);
    return cors({ error: "Internal server error", detail: err.message }, 500);
  }
};
