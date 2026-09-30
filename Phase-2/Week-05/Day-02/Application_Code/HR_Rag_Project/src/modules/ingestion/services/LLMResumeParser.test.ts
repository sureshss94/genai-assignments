import Groq from "groq-sdk";
import { GoogleGenAI } from "@google/genai";
import { env } from "../../../config/env";
import { LLMResumeParser, validateParsedResume } from "./LLMResumeParser";

jest.mock("groq-sdk", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("@google/genai", () => ({ GoogleGenAI: jest.fn() }));

const mockGroqCreate = jest.fn();
const mockGeminiGenerateContent = jest.fn();
const mockedGroq = jest.mocked(Groq);
const mockedGemini = jest.mocked(GoogleGenAI);

beforeEach(() => {
  jest.clearAllMocks();
  env.groqApiKey = "groq-test-key";
  env.groqModel = "groq-test-model";
  env.geminiApiKey = "gemini-test-key";
  env.geminiModel = "gemini-test-model";
  mockedGroq.mockImplementation(
    () =>
      ({
        chat: { completions: { create: mockGroqCreate } }
      }) as unknown as Groq
  );
  mockedGemini.mockImplementation(
    () =>
      ({
        models: { generateContent: mockGeminiGenerateContent }
      }) as unknown as GoogleGenAI
  );
});

describe("LLM resume output validation", () => {
  test("accepts supported fields and omits null values", () => {
    expect(
      validateParsedResume({
        name: "  Arun Raj  ",
        email: null,
        totalExperience: 13,
        skills: ["  Selenium  ", "Python"]
      })
    ).toEqual({
      name: "Arun Raj",
      totalExperience: 13,
      skills: ["Selenium", "Python"]
    });
  });

  test("rejects malformed skills and unsupported fields", () => {
    expect(() => validateParsedResume({ skills: "Python" })).toThrow(
      "LLM response skills must be an array of strings"
    );
    expect(() => validateParsedResume({ skills: [], inventedField: "value" })).toThrow(
      "LLM response contains unsupported fields"
    );
  });

  test("rejects negative or non-numeric experience", () => {
    expect(() => validateParsedResume({ skills: [], totalExperience: -1 })).toThrow(
      "LLM response field totalExperience must be a non-negative number"
    );
  });
});

describe("LLM provider failover", () => {
  test("switches to Gemini after a Groq rate limit and keeps using Gemini", async () => {
    mockGroqCreate.mockRejectedValueOnce(Object.assign(new Error("quota reached"), { status: 429 }));
    mockGeminiGenerateContent.mockResolvedValue({ text: '{"skills":["Java"]}' });

    const parser = new LLMResumeParser();
    await expect(parser.parseResume("resume text")).resolves.toEqual({ skills: ["Java"] });
    await expect(parser.parseResume("another resume")).resolves.toEqual({ skills: ["Java"] });

    expect(mockGroqCreate).toHaveBeenCalledTimes(1);
    expect(mockGeminiGenerateContent).toHaveBeenCalledTimes(2);
  });

  test("does not fail over for non-rate-limit Groq errors", async () => {
    mockGroqCreate.mockRejectedValueOnce(Object.assign(new Error("invalid request"), { status: 400 }));

    await expect(new LLMResumeParser().parseResume("resume text")).rejects.toThrow("invalid request");
    expect(mockGeminiGenerateContent).not.toHaveBeenCalled();
  });
});