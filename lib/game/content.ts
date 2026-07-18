import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { LevelDefinitionSchema, type LevelDefinition } from "../schemas";

const contentDirectory = path.join(process.cwd(), "content");

function readLevels(): LevelDefinition[] {
  return readdirSync(contentDirectory)
    .filter((fileName) => fileName.endsWith(".json"))
    .sort()
    .map((fileName) => {
      const filePath = path.join(contentDirectory, fileName);
      const content: unknown = JSON.parse(readFileSync(filePath, "utf8"));
      return LevelDefinitionSchema.parse(content);
    });
}

export function loadAllLevels(): LevelDefinition[] {
  return readLevels().sort(
    (left, right) =>
      left.topic.localeCompare(right.topic) ||
      left.tier - right.tier ||
      left.orderIndex - right.orderIndex,
  );
}

export function getLevelBySlug(slug: string): LevelDefinition | undefined {
  return loadAllLevels().find((level) => level.slug === slug);
}
