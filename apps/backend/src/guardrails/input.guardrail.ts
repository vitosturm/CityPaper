import type { AgentRequest } from "#schemas";

const UNSAFE_PATTERN = /<[^>]+>|(['";])\s*(drop|select|insert|update|delete|union)\s/i;

type GuardrailResult = { valid: true } | { valid: false; reason: string };

export function validateInput(input: AgentRequest): GuardrailResult {
  if (input.city.trim().length < 2) {
    return { valid: false, reason: "City name too short (minimum 2 characters)." };
  }

  if (UNSAFE_PATTERN.test(input.city)) {
    return { valid: false, reason: "Invalid input detected." };
  }

  if (input.lat !== undefined || input.lng !== undefined) {
    const lat = input.lat ?? 0;
    const lng = input.lng ?? 0;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return { valid: false, reason: "Invalid coordinates provided." };
    }
  }

  return { valid: true };
}
