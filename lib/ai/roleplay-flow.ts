import type { Persona, RoleplayTurn } from "../schemas";
import { generateRoleplayTurn } from "./client";

export function shouldEvaluateRoleplayTurn(
  turnNumber: number,
  maxTurns: number,
  turn: Pick<RoleplayTurn, "isClosing">,
): boolean {
  return turn.isClosing || turnNumber >= maxTurns;
}

export async function generateRoleplayAttemptTurn(input: {
  persona: Persona;
  turnNumber: number;
  transcript: { role: "player" | "persona"; content: string }[];
}): Promise<{ personaTurn: RoleplayTurn; shouldEvaluate: boolean }> {
  const personaTurn = await generateRoleplayTurn(
    input.persona,
    input.turnNumber,
    input.transcript,
  );

  return {
    personaTurn,
    shouldEvaluate: shouldEvaluateRoleplayTurn(
      input.turnNumber,
      input.persona.maxTurns,
      personaTurn,
    ),
  };
}
