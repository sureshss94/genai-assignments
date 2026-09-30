import { buildRequestLogEvent } from "./logger";

describe("request logger", () => {
  test("builds a structured request log without sensitive payload fields", () => {
    const event = buildRequestLogEvent({
      requestId: "abc123",
      request: {
        method: "POST",
        originalUrl: "/v1/resume/ingest",
        body: { rawText: "secret" }
      } as any,
      response: { statusCode: 200 } as any,
      startedAt: 1000,
      extra: {
        fileName: "resume.pdf",
        totalFiles: 2,
        successfulCount: 2,
        extractMs: 100,
        parseMs: 80,
        embeddingMs: 250,
        mongoInsertMs: 60,
        totalMs: 500
      }
    });

    expect(event).toMatchObject({
      requestId: "abc123",
      method: "POST",
      endpoint: "/v1/resume/ingest",
      statusCode: 200,
      fileName: "resume.pdf",
      totalFiles: 2,
      successfulCount: 2,
      extractMs: 100,
      parseMs: 80,
      embeddingMs: 250,
      mongoInsertMs: 60,
      totalMs: 500
    });
    expect(JSON.stringify(event)).not.toContain("secret");
  });
});
