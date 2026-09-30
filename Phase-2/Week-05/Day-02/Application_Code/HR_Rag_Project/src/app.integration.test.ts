process.env.MISTRAL_API_KEY = "test-key";
process.env.MONGODB_URI = "mongodb://localhost:27017/test";
process.env.EMBEDDING_DIMENSION = "3";
process.env.USE_LLM_PARSER = "false";

jest.mock("@mistralai/mistralai", () => ({
  Mistral: class Mistral {
    embeddings = {
      create: jest.fn().mockResolvedValue({
        data: [{ embedding: [1, 2, 3] }]
      })
    };
  }
}));

jest.mock("groq-sdk", () => {
  return {
    __esModule: true,
    default: class Groq {
      chat = {
        completions: {
          create: jest.fn()
        }
      };
    }
  };
});

jest.mock("pdf-parse", () => ({
  PDFParse: class PDFParse {
    constructor() {
      return this;
    }
    async getText() {
      return { text: "John Doe\nSenior Software Engineer\nJavaScript TypeScript Node.js React SQL\n" };
    }
    async destroy() {
      return undefined;
    }
  }
}));

jest.mock("./config/database", () => {
  const fakeCollection = {
    createIndex: jest.fn().mockResolvedValue("resume_content_hash_unique"),
    updateOne: jest.fn().mockResolvedValue({
      upsertedId: { toString: () => "resume-123" }
    }),
    findOne: jest.fn().mockResolvedValue({
      _id: { toString: () => "resume-123" }
    })
  };

  return {
    getMongoClient: jest.fn(),
    getMongoDatabase: jest.fn(),
    getResumesCollection: jest.fn().mockResolvedValue(fakeCollection)
  };
});

import app from "./app";

const startTestServer = async () => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => {
    server.once("listening", () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Server did not bind to a TCP port");
  }

  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`
  };
};

describe("resume ingestion app integration", () => {
  test("health endpoint responds successfully", async () => {
    const { server, baseUrl } = await startTestServer();

    try {
      const response = await fetch(`${baseUrl}/v1/health`);
      expect(response.status).toBe(200);

      const payload = await response.json();
      expect(payload).toMatchObject({
        status: "ok",
        app: "resume-rag-backend"
      });
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }
  });

  test("upload endpoint requires a file and returns a stable error payload", async () => {
    const { server, baseUrl } = await startTestServer();

    try {
      const response = await fetch(`${baseUrl}/v1/resume/upload`, {
        method: "POST"
      });

      expect(response.status).toBe(400);
      expect(response.headers.get("x-request-id")).toBeTruthy();

      const payload = await response.json();
      expect(payload).toMatchObject({
        success: false,
        errorCode: "FILE_REQUIRED",
        message: "Resume PDF is required"
      });
      expect(payload.requestId).toBeTruthy();
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }
  });

  test("upload endpoint rejects non-pdf files with the invalid file contract", async () => {
    const { server, baseUrl } = await startTestServer();
    const formData = new FormData();
    formData.append("file", new Blob(["not a pdf"], { type: "text/plain" }), "notes.txt");

    try {
      const response = await fetch(`${baseUrl}/v1/resume/upload`, {
        method: "POST",
        body: formData
      });

      expect(response.status).toBe(415);
      const payload = await response.json();
      expect(payload).toMatchObject({
        success: false,
        errorCode: "INVALID_FILE_TYPE",
        message: "Only PDF files are allowed"
      });
      expect(payload.requestId).toBeTruthy();
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }
  });

  test("ingest endpoint succeeds for a generated PDF sample", async () => {
    const { server, baseUrl } = await startTestServer();
    const formData = new FormData();
    formData.append(
      "file",
      new Blob(["%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"], {
        type: "application/pdf"
      }),
      "resume.pdf"
    );

    try {
      const response = await fetch(`${baseUrl}/v1/resume/ingest`, {
        method: "POST",
        body: formData
      });

      expect(response.status).toBe(200);
      const payload = await response.json();
      expect(payload).toMatchObject({
        success: true,
        message: "Resume ingestion completed",
        resumeId: "resume-123",
        data: {
          name: "John Doe",
          role: "Senior Software Engineer",
          company: null,
          totalExperience: null,
          skillsCount: 1
        }
      });
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }
  });

  test("batch limit can be configured to 10 files per request", async () => {
    const originalBatchLimit = process.env.RESUME_BATCH_LIMIT;
    process.env.RESUME_BATCH_LIMIT = "10";
    jest.resetModules();

    try {
      const { default: appWithBatchLimit } = await import("./app");
      const server = appWithBatchLimit.listen(0, "127.0.0.1");
      await new Promise<void>((resolve) => {
        server.once("listening", () => resolve());
      });

      const address = server.address();
      if (!address || typeof address === "string") {
        throw new Error("Server did not bind to a TCP port");
      }

      const formData = new FormData();
      for (let index = 0; index < 10; index += 1) {
        formData.append(
          "file",
          new Blob(["%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"], {
            type: "application/pdf"
          }),
          `resume-${index + 1}.pdf`
        );
      }

      const response = await fetch(`http://127.0.0.1:${address.port}/v1/resume/ingest`, {
        method: "POST",
        body: formData
      });

      expect(response.status).toBe(200);
      const payload = await response.json();
      expect(payload).toMatchObject({
        success: true,
        message: "Resume ingestion completed",
        totalFiles: 10,
        successfulCount: 10,
        failedCount: 0
      });

      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    } finally {
      if (originalBatchLimit === undefined) {
        delete process.env.RESUME_BATCH_LIMIT;
      } else {
        process.env.RESUME_BATCH_LIMIT = originalBatchLimit;
      }
      jest.resetModules();
    }
  });
});
