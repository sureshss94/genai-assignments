import { unlink } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { env } from "../../../config/env";
import { ParsedResume } from "../types/ingestion.types";
import { EmbeddingService } from "./EmbeddingService";
import { LLMResumeParser } from "./LLMResumeParser";
import { ResumeParserService } from "./ResumeParserService";
import { AlgorithmResumeParser } from "./AlgorithmResumeParser";
import { ResumeIngestionRepository } from "../repositories/ResumeIngestionRepository";
import { cleanText } from "../utils/textCleaner";

export interface ResumeIngestionResult {
	resumeId: string;
	resume: ParsedResume;
	timings: {
		extractMs: number;
		cleanMs: number;
		parseMs: number;
		embeddingMs: number;
		mongoInsertMs: number;
		totalMs: number;
	};
}

export class ResumeIngestionError extends Error {
	constructor(
		readonly statusCode: number,
		readonly errorCode: string,
		message: string
	) {
		super(message);
	}
}

export class ResumeIngestionService {
	constructor(
		private readonly resumeParserService = new ResumeParserService(),
		private readonly algorithmResumeParser = new AlgorithmResumeParser(),
		private readonly llmResumeParser = new LLMResumeParser(),
		private readonly embeddingService = new EmbeddingService(),
		private readonly repository = new ResumeIngestionRepository()
	) {}

	async ingestResume(file: Express.Multer.File): Promise<ResumeIngestionResult> {
		const totalStart = performance.now();

		try {
			const extractStart = performance.now();
			let extractedText: string;
			try {
				extractedText = await this.resumeParserService.extractTextFromPdf(file.path);
			} catch {
				throw new ResumeIngestionError(422, "RESUME_EXTRACTION_FAILED", "Resume extraction failed");
			}
			const extractMs = Math.round(performance.now() - extractStart);

			if (!extractedText.trim()) {
				throw new ResumeIngestionError(422, "RESUME_EXTRACTION_FAILED", "Resume extraction failed");
			}

			const cleanStart = performance.now();
			const rawText = cleanText(extractedText);
			const cleanMs = Math.round(performance.now() - cleanStart);

			const parseStart = performance.now();
			let resume: ParsedResume;
			try {
				resume = env.useLlmParser
					? await this.llmResumeParser.parseResume(rawText)
					: this.algorithmResumeParser.parseResume(rawText);
			} catch {
				throw new ResumeIngestionError(422, "RESUME_PARSE_FAILED", "Resume parsing failed");
			}
			const parseMs = Math.round(performance.now() - parseStart);

			const embeddingStart = performance.now();
			let embedding: number[];
			try {
				embedding = await this.embeddingService.generateResumeEmbedding({
					name: resume.name,
					role: resume.role,
					skills: resume.skills,
					company: resume.company,
					experienceSummary: resume.experienceSummary,
					rawText
				});
			} catch {
				throw new ResumeIngestionError(502, "EMBEDDING_FAILED", "Mistral embedding failed");
			}
			const embeddingMs = Math.round(performance.now() - embeddingStart);

			const mongoInsertStart = performance.now();
			let resumeId: string;
			try {
				resumeId = await this.repository.storeResume({
					fileName: file.originalname,
					resume,
					rawText,
					embedding
				});
			} catch {
				throw new ResumeIngestionError(503, "INGESTION_FAILED", "Resume ingestion failed");
			}
			const mongoInsertMs = Math.round(performance.now() - mongoInsertStart);

			return {
				resumeId,
				resume,
				timings: {
					extractMs,
					cleanMs,
					parseMs,
					embeddingMs,
					mongoInsertMs,
					totalMs: Math.round(performance.now() - totalStart)
				}
			};
		} finally {
			await unlink(file.path).catch(() => undefined);
		}
	}
}