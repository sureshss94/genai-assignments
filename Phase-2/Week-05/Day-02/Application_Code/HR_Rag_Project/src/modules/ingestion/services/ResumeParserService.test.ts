import { readFile } from "node:fs/promises";
import { GoogleGenAI } from "@google/genai";
import { PDFParse } from "pdf-parse";
import { env } from "../../../config/env";
import { ResumeParserService } from "./ResumeParserService";

jest.mock("node:fs/promises", () => ({ readFile: jest.fn() }));
jest.mock("@google/genai", () => ({ GoogleGenAI: jest.fn() }));
jest.mock("pdf-parse", () => ({ PDFParse: jest.fn() }));

const mockGetText = jest.fn();
const mockDestroy = jest.fn();
const mockGenerateContent = jest.fn();
const mockedGoogleGenAI = jest.mocked(GoogleGenAI);
const mockedPDFParse = jest.mocked(PDFParse);

beforeEach(() => {
	jest.clearAllMocks();
	env.geminiApiKey = "gemini-test-key";
	env.geminiModel = "gemini-test-model";
	jest.mocked(readFile).mockResolvedValue(Buffer.from("sample pdf"));
	mockedPDFParse.mockImplementation(
		() => ({ getText: mockGetText, destroy: mockDestroy }) as unknown as PDFParse
	);
	mockedGoogleGenAI.mockImplementation(
		() => ({ models: { generateContent: mockGenerateContent } }) as unknown as GoogleGenAI
	);
});

describe("ResumeParserService", () => {
	test("uses extracted text without calling Gemini when PDF text is available", async () => {
		mockGetText.mockResolvedValue({ text: "Readable resume text" });

		await expect(new ResumeParserService().extractTextFromPdf("resume.pdf")).resolves.toBe(
			"Readable resume text"
		);
		expect(mockGenerateContent).not.toHaveBeenCalled();
	});

	test("uses Gemini PDF extraction when local extraction returns no text", async () => {
		mockGetText.mockResolvedValue({ text: "\n\f" });
		mockGenerateContent.mockResolvedValue({ text: "OCR resume text" });

		await expect(new ResumeParserService().extractTextFromPdf("scanned-resume.pdf")).resolves.toBe(
			"OCR resume text"
		);
		expect(mockGenerateContent).toHaveBeenCalledWith(
			expect.objectContaining({
				model: "gemini-test-model",
				contents: expect.arrayContaining([
					expect.objectContaining({ inlineData: expect.objectContaining({ mimeType: "application/pdf" }) })
				])
			})
		);
	});
});