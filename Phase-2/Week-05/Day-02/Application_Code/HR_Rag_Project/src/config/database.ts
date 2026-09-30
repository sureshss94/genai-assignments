import { MongoClient } from "mongodb";
import { env } from "./env";

let client: MongoClient | undefined;
let connection: Promise<MongoClient> | undefined;

export function getMongoClient(): Promise<MongoClient> {
  if (!env.mongodbUri) {
    return Promise.reject(new Error("MONGODB_URI is required before using MongoDB"));
  }

  client ??= new MongoClient(env.mongodbUri);
  connection ??= client.connect().catch((error: unknown) => {
    connection = undefined;
    throw error;
  });

  return connection;
}

export async function closeMongoClient(): Promise<void> {
  if (!client) {
    return;
  }

  await client.close();
  client = undefined;
  connection = undefined;
}

export async function getMongoDatabase() {
  const connectedClient = await getMongoClient();
  return connectedClient.db(env.mongodbDbName);
}

export async function getResumesCollection() {
  const database = await getMongoDatabase();
  return database.collection("resumes");
}