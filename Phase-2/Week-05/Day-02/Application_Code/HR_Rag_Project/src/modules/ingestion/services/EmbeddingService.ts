import { Mistral } from "@mistralai/mistralai";
import { env } from "../../../config/env";

export interface ResumeEmbeddingInput {
	name?: string;
	role?: string;
	skills: string[];
	company?: string;
	experienceSummary?: string;
	rawText: string;
}

export function buildEmbeddingText(input: ResumeEmbeddingInput): string {
	return [
		input.name ?? "",
		input.role ?? "",
		input.skills.join(", "),
		input.company ?? "",
		input.experienceSummary ?? "",
		input.rawText
	].join("\n");
}

export class EmbeddingService {
	private client: Mistral | undefined;

	async generateResumeEmbedding(input: ResumeEmbeddingInput): Promise<number[]> {
		if (!env.mistralApiKey) {
			throw new Error("MISTRAL_API_KEY is required to generate embeddings");
		}

		this.client ??= new Mistral({ apiKey: env.mistralApiKey });

		const result = await this.client.embeddings.create({
			model: env.mistralEmbedModel,
			inputs: buildEmbeddingText(input)
		});
		const embedding = result.data[0]?.embedding;

		if (
			!embedding ||
			embedding.length !== env.embeddingDimension ||
			embedding.some((value) => !Number.isFinite(value))
		) {
			throw new Error("Mistral returned an invalid embedding vector");
		}

		return embedding;
	}
}