import { copyFile, mkdtemp, readdir, rm, stat } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { closeMongoClient } from "../config/database";
import { env } from "../config/env";
import { ResumeIngestionService } from "../modules/ingestion/services/ResumeIngestionService";

async function getPdfFiles(folderPath: string): Promise<string[]> {
  const entries = await readdir(folderPath);

  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(folderPath, entry);
      const info = await stat(fullPath);

      if (!info.isFile() || !entry.toLowerCase().endsWith(".pdf")) {
        return null;
      }

      return fullPath;
    })
  );

  return files.filter((file): file is string => Boolean(file));
}

async function main() {
  const folderPath = resolve(process.cwd(), "src/Resumes");
  const batchSize = env.resumeBatchLimit;
  const allFiles = await getPdfFiles(folderPath);
  const skipFileNames = new Set<string>(JSON.parse(process.env.RESUME_SKIP_FILES ?? "[]"));
  const files = allFiles.filter((filePath) => !skipFileNames.has(basename(filePath)));
  const skippedCount = allFiles.length - files.length;

  if (files.length === 0) {
    console.log(JSON.stringify({ totalPdfFiles: allFiles.length, attempted: 0, succeeded: 0, failed: 0, skipped: skippedCount }));
    return;
  }

  const ingestionService = new ResumeIngestionService();
  const tempDirectory = await mkdtemp(join(tmpdir(), "resume-batch-"));
  let succeeded = 0;
  let failed = 0;

  try {
    for (let startIndex = 0; startIndex < files.length; startIndex += batchSize) {
      const batch = files.slice(startIndex, startIndex + batchSize);
      const batchResults = [] as Array<{ fileName: string; success: boolean; resumeId?: string; errorCode?: string; message?: string }>;

      for (const filePath of batch) {
        const fileName = basename(filePath);
        const stagedPath = join(tempDirectory, fileName);

        try {
          await copyFile(filePath, stagedPath);
          const result = await ingestionService.ingestResume({
            fieldname: "file",
            originalname: fileName,
            encoding: "7bit",
            mimetype: "application/pdf",
            size: (await stat(stagedPath)).size,
            destination: tempDirectory,
            filename: fileName,
            path: stagedPath,
            buffer: Buffer.alloc(0)
          } as Express.Multer.File);

          succeeded += 1;
          batchResults.push({
            fileName,
            success: true,
            resumeId: result.resumeId
          });
        } catch (error) {
          failed += 1;
          batchResults.push({
            fileName,
            success: false,
            errorCode: error instanceof Error ? "INGESTION_FAILED" : "UNKNOWN_ERROR",
            message: error instanceof Error ? error.message : "Resume ingestion failed"
          });
        } finally {
          await rm(stagedPath, { force: true });
        }
      }

      console.log(JSON.stringify({
        batchNumber: Math.floor(startIndex / batchSize) + 1,
        batchSize: batch.length,
        results: batchResults
      }));
    }
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
    await closeMongoClient();
  }

  console.log(JSON.stringify({ totalPdfFiles: allFiles.length, attempted: files.length, succeeded, failed, skipped: skippedCount }));
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Batch resume ingestion failed");
    console.error(error);
    process.exitCode = 1;
  });
}
