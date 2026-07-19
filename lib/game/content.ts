import { LevelDefinitionSchema, type LevelDefinition } from "../schemas";
import businessModelT1 from "../../content/business_model_t1.json";
import financeT2 from "../../content/finance_t2.json";
import industryT1 from "../../content/industry_t1.json";
import pitchingT1 from "../../content/pitching_t1.json";
import productPipelineT1 from "../../content/product_pipeline_t1.json";

const authoredLevels: unknown[] = [
  businessModelT1,
  financeT2,
  industryT1,
  pitchingT1,
  productPipelineT1,
];

function readLevels(): LevelDefinition[] {
  return authoredLevels.map((content) => LevelDefinitionSchema.parse(content));
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
