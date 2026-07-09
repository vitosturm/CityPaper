import type { RequestHandler } from "express";
import { AgentRequestSchema } from "#schemas";
import { validateInput } from "#guardrails";
import { runOrchestrator } from "#agents";

export const agentHandler: RequestHandler = async (req, res) => {
  const parsed = AgentRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
    return;
  }

  const guardrail = validateInput(parsed.data);
  if (!guardrail.valid) {
    res.status(400).json({ error: guardrail.reason });
    return;
  }

  const newspaper = await runOrchestrator(parsed.data.city);
  res.json(newspaper);
};
