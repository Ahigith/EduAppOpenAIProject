import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { LevelDefinitionSchema } from "../lib/schemas";

const contentDirectory = path.join(process.cwd(), "content");

async function validateContent(): Promise<void> {
  const fileNames = (await readdir(contentDirectory))
    .filter((fileName) => fileName.endsWith(".json"))
    .sort();

  const results = await Promise.all(
    fileNames.map(async (fileName) => {
      const filePath = path.join(contentDirectory, fileName);

      try {
        const parsedJson: unknown = JSON.parse(await readFile(filePath, "utf8"));
        const result = LevelDefinitionSchema.safeParse(parsedJson);

        return result.success
          ? { fileName, status: "PASS" as const, errors: [] }
          : {
              fileName,
              status: "FAIL" as const,
              errors: result.error.issues.map((issue) => ({
                path: issue.path.length === 0 ? "(root)" : issue.path.join("."),
                message: issue.message,
              })),
            };
      } catch (error) {
        return {
          fileName,
          status: "FAIL" as const,
          errors: [
            {
              path: "(root)",
              message: error instanceof Error ? error.message : String(error),
            },
          ],
        };
      }
    }),
  );

  console.table(results.map(({ fileName, status }) => ({ file: fileName, status })));

  const failedResults = results.filter((result) => result.status === "FAIL");
  if (failedResults.length > 0) {
    for (const result of failedResults) {
      for (const error of result.errors) {
        console.error(`${result.fileName}: ${error.path}: ${error.message}`);
      }
    }
    process.exitCode = 1;
  }
}

void validateContent();
