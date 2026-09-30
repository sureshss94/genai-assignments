import { createErrorPayload } from "./errorResponse";

describe("error response contract", () => {
  test("adds requestId and standard fields for ingestion errors", () => {
    expect(createErrorPayload("abc123", 502, "EMBEDDING_FAILED", "Mistral embedding failed")).toEqual({
      success: false,
      requestId: "abc123",
      errorCode: "EMBEDDING_FAILED",
      message: "Mistral embedding failed"
    });
  });
});
