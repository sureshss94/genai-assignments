import { createHash } from "node:crypto";
import { ObjectId } from "mongodb";
import { env } from "../../../config/env";
import { getResumesCollection } from "../../../config/database";
import { ParsedResume } from "../types/ingestion.types";

export interface StoreResumeInput {
	fileName: string;
	resume: ParsedResume;
	rawText: string;
	embedding: number[];
}

let contentHashIndex: Promise<string> | undefined;

export class ResumeIngestionRepository {
	async storeResume(input: StoreResumeInput): Promise<string> {
		const collection = await getResumesCollection();
		contentHashIndex ??= collection
			.createIndex({ contentHash: 1 }, { unique: true, name: "resume_content_hash_unique" })
			.catch((error: unknown) => {
				contentHashIndex = undefined;
				throw error;
			});
		await contentHashIndex;

		const now = new Date();
		const contentHash = createHash("sha256").update(input.rawText.trim()).digest("hex");
		const document = {
			fileName: input.fileName,
			rawText: input.rawText,
			name: input.resume.name ?? null,
			email: input.resume.email ?? null,
			phone: input.resume.phone ?? null,
			location: input.resume.location ?? null,
			company: input.resume.company ?? null,
			role: input.resume.role ?? null,
			education: input.resume.education ?? null,
			totalExperience: input.resume.totalExperience ?? null,
			relevantExperience: input.resume.relevantExperience ?? null,
			skills: input.resume.skills,
			jobTitles: input.resume.jobTitles ?? [],
			experienceSummary: input.resume.experienceSummary ?? null,
			embedding: input.embedding,
			embeddingModel: env.mistralEmbedModel,
			embeddingDimension: env.embeddingDimension,
			contentHash,
			createdAt: now,
			updatedAt: now
		};

		try {
			const result = await collection.updateOne(
				{ contentHash },
				{ $setOnInsert: document },
				{ upsert: true }
			);

			if (result.upsertedId) {
				return result.upsertedId.toString();
			}
		} catch (error) {
			if (!(typeof error === "object" && error !== null && "code" in error && error.code === 11000)) {
				throw error;
			}
		}

		const existing = await collection.findOne(
			{ contentHash },
			{ projection: { _id: 1 } }
		);

		if (!existing?._id) {
			throw new Error("Stored resume could not be read after upsert");
		}

		return (existing._id as ObjectId).toString();
	}
}