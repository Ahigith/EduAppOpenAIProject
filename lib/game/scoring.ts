import type {
  DeterministicResult,
  Gameplay,
} from "../schemas";

type SortBucketsGameplay = Extract<Gameplay, { kind: "sort_buckets" }>;
type SequenceGameplay = Extract<Gameplay, { kind: "sequence" }>;
type SequenceStep = SequenceGameplay["steps"][number];

function buildResult(
  correctCount: number,
  totalCount: number,
  passPercent: number,
  perItem: DeterministicResult["perItem"],
): DeterministicResult {
  const percent = totalCount === 0 ? 0 : Math.round((correctCount / totalCount) * 100);

  return {
    correctCount,
    totalCount,
    percent,
    passed: percent >= passPercent,
    perItem,
  };
}

export function scoreSortBuckets(
  gameplay: SortBucketsGameplay,
  answers: Record<string, string>,
): DeterministicResult {
  const perItem = gameplay.items.map((item) => ({
    id: item.id,
    label: item.label,
    correct: answers[item.id] === item.correctBucket,
    explain: item.explain,
  }));
  const correctCount = perItem.filter((item) => item.correct).length;

  return buildResult(correctCount, gameplay.items.length, gameplay.passPercent, perItem);
}

export function scoreSequence(
  gameplay: SequenceGameplay,
  playerOrder: string[],
): DeterministicResult {
  const perItem = gameplay.steps.map((step, index) => ({
    id: step.id,
    label: step.label,
    correct: playerOrder[index] === step.id,
    explain: step.explain,
  }));
  const correctCount = perItem.filter((item) => item.correct).length;

  return buildResult(correctCount, gameplay.steps.length, gameplay.passPercent, perItem);
}

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleSteps(steps: SequenceStep[], seed: number): SequenceStep[] {
  if (steps.length < 2) {
    throw new RangeError("shuffleSteps requires at least two steps");
  }

  const shuffled = [...steps];
  const random = createSeededRandom(seed);

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  if (shuffled.every((step, index) => step === steps[index])) {
    shuffled.push(shuffled.shift()!);
  }

  return shuffled;
}
