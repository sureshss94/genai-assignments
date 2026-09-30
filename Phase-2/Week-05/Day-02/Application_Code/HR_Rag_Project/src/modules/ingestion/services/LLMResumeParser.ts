import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import { env } from "../../../config/env";
import { ParsedResume } from "../types/ingestion.types";

const resumeExtractionPrompt =
	"Extract resume fields from the supplied text without inferring missing facts. Return only a JSON object with a required skills array of strings and these optional fields: name, email, phone, location, company, role, education, totalExperience, relevantExperience, jobTitles, experienceSummary. All fields except totalExperience and relevantExperience must be strings, except skills and jobTitles which must be arrays of strings. totalExperience and relevantExperience must be non-negative numbers. Never return nested objects or arrays for scalar fields. Omit unsupported values.";

const allowedKeys = new Set<keyof ParsedResume>([
	"name",
	"email",
	"phone",
	"location",
	"company",
	"role",
	"education",
	"totalExperience",
	"relevantExperience",
	"skills",
	"jobTitles",
	"experienceSummary"
]);

export function validateParsedResume(value: unknown): ParsedResume {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new Error("LLM response must be a JSON object");
	}

	const record = value as Record<string, unknown>;
	if (Object.keys(record).some((key) => !allowedKeys.has(key as keyof ParsedResume))) {
		throw new Error("LLM response contains unsupported fields");
	}
	if (!Array.isArray(record.skills) || record.skills.some((skill) => typeof skill !== "string")) {
		throw new Error("LLM response skills must be an array of strings");
	}

	const resume: ParsedResume = {
		skills: record.skills.map((skill) => (skill as string).trim()).filter(Boolean)
	};
	const stringFields = [
		"name",
		"email",
		"phone",
		"location",
		"company",
		"role",
		"education",
		"experienceSummary"
	] as const;

	for (const field of stringFields) {
		const fieldValue = record[field];
		if (fieldValue === undefined || fieldValue === null) continue;
		if (typeof fieldValue !== "string") {
			throw new Error(`LLM response field ${field} must be a string`);
		}
		const normalizedValue = fieldValue.trim();
		if (normalizedValue) resume[field] = normalizedValue;
	}

	for (const field of ["totalExperience", "relevantExperience"] as const) {
		const fieldValue = record[field];
		if (fieldValue === undefined || fieldValue === null) continue;
		if (typeof fieldValue !== "number" || !Number.isFinite(fieldValue) || fieldValue < 0) {
			throw new Error(`LLM response field ${field} must be a non-negative number`);
		}
		resume[field] = fieldValue;
	}

	if (record.jobTitles !== undefined && record.jobTitles !== null) {
		if (!Array.isArray(record.jobTitles) || record.jobTitles.some((title) => typeof title !== "string")) {
			throw new Error("LLM response jobTitles must be an array of strings");
		}
		resume.jobTitles = record.jobTitles.map((title) => (title as string).trim()).filter(Boolean);
	}

	return resume;
}

export class LLMResumeParser {
	private groqClient: Groq | undefined;
	private geminiClient: GoogleGenAI | undefined;
	private groqRateLimited = false;

	async parseResume(rawText: string): Promise<ParsedResume> {
		if (!env.groqApiKey || this.groqRateLimited) {
			return this.parseWithGemini(rawText);
		}

		this.groqClient ??= new Groq({ apiKey: env.groqApiKey });

		try {
			const completion = await this.groqClient.chat.completions.create({
				model: env.groqModel,
				temperature: 0,
				response_format: { type: "json_object" },
				messages: [
					{ role: "system", content: resumeExtractionPrompt },
					{ role: "user", content: rawText }
				]
			});

			const content = completion.choices[0]?.message.content;
			if (!content) {
				throw new Error("LLM response did not contain JSON content");
			}

			return validateParsedResume(JSON.parse(content) as unknown);
		} catch (error) {
			if (!isRateLimitError(error) || !env.geminiApiKey) {
				throw error;
			}

			this.groqRateLimited = true;
			return this.parseWithGemini(rawText);
		}
	}

	private async parseWithGemini(rawText: string): Promise<ParsedResume> {
		if (!env.geminiApiKey) {
			throw new Error("GEMINI_API_KEY is required when Groq is unavailable");
		}

		this.geminiClient ??= new GoogleGenAI({ apiKey: env.geminiApiKey });
		const response = await this.geminiClient.models.generateContent({
			model: env.geminiModel,
			contents: `${resumeExtractionPrompt}\n\nResume:\n${rawText}`,
			config: {
				temperature: 0,
				responseMimeType: "application/json"
			}
		});

		if (!response.text) {
			throw new Error("Gemini response did not contain JSON content");
		}

		return validateParsedResume(JSON.parse(response.text) as unknown);
	}
}

function isRateLimitError(error: unknown): boolean {
	if (typeof error !== "object" || error === null) {
		return false;
	}

	if ("status" in error && error.status === 429) {
		return true;
	}

	return error instanceof Error && /\b429\b|rate.?limit|quota/i.test(error.message);
}