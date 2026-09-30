import { readFile } from "node:fs/promises";
import { GoogleGenAI } from "@google/genai";
import { env } from "../../../config/env";
import { PDFParse } from "pdf-parse";

export class ResumeParserService {
	private geminiClient: GoogleGenAI | undefined;

	async extractTextFromPdf(filePath: string): Promise<string> {
		const pdfData = await readFile(filePath);
		const parser = new PDFParse({ data: pdfData });
		let extractedText = "";
		let parseError: unknown;

		try {
			const result = await parser.getText({ pageJoiner: "" });
			extractedText = result.text;
		} catch (error) {
			parseError = error;
		} finally {
			await parser.destroy();
		}

		if (extractedText.trim()) {
			return extractedText;
		}

		if (!env.geminiApiKey) {
			if (parseError) throw parseError;
			return extractedText;
		}

		this.geminiClient ??= new GoogleGenAI({ apiKey: env.geminiApiKey });
		const response = await this.geminiClient.models.generateContent({
			model: env.geminiModel,
			contents: [
				{
					inlineData: {
						mimeType: "application/pdf",
						data: pdfData.toString("base64")
					}
				},
				{
					text: "Extract all readable text from this PDF in reading order. Return only the extracted text. Do not infer, summarize, or add information."
				}
			]
		});

		return response.text?.trim() ?? "";
	}
}