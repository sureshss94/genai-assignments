import dotenv from "dotenv";

dotenv.config();

const port = Number(process.env.PORT ?? 3000);
const embeddingDimension = Number(process.env.EMBEDDING_DIMENSION ?? 1024);
const resumeBatchLimit = Number(process.env.RESUME_BATCH_LIMIT ?? 5);
const configuredGeminiModel = process.env.GEMINI_MODEL ?? process.env.Gemini_Model;

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535");
}

if (!Number.isInteger(embeddingDimension) || embeddingDimension < 1) {
  throw new Error("EMBEDDING_DIMENSION must be a positive integer");
}

if (!Number.isInteger(resumeBatchLimit) || resumeBatchLimit < 1 || resumeBatchLimit > 10) {
  throw new Error("RESUME_BATCH_LIMIT must be an integer between 1 and 10");
}

export const env = {
  port,
  nodeEnv: process.env.NODE_ENV ?? "development",
  mongodbUri: process.env.MONGODB_URI,
  mongodbDbName: process.env.MONGODB_DB_NAME ?? "resume_rag",
  useLlmParser: process.env.USE_LLM_PARSER === "true",
  groqApiKey: process.env.GROQ_API_KEY,
  groqModel: process.env.GROQ_MODEL ?? "openai/gpt-oss-20b",
  geminiApiKey: process.env.GEMINI_API_KEY ?? process.env.Gemini_API_KEY,
  geminiModel:
    configuredGeminiModel === "gemini-1.5"
      ? "gemini-3.1-flash-lite"
      : configuredGeminiModel ?? "gemini-3.1-flash-lite",
  mistralApiKey: process.env.MISTRAL_API_KEY,
  mistralEmbedModel: process.env.MISTRAL_EMBED_MODEL ?? "mistral-embed",
  embeddingDimension,
  resumeBatchLimit
};