import dotenv from "dotenv";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";
const secret = process.env.JWT_SECRET?.trim();

if (isProduction && (!secret || secret.length < 32)) {
  throw new Error(
    "JWT_SECRET é obrigatório em produção (mínimo 32 caracteres). Configure no Coolify/.env.",
  );
}

export const JWT_SECRET =
  secret || "dev-only-benny-secret-not-for-production";
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
