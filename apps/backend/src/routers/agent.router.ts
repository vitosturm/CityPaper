import { Router } from "express";
import { agentHandler } from "#controllers";

/**
 * @openapi
 * /agent:
 *   post:
 *     summary: Generate a CityPaper newspaper edition
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [city]
 *             properties:
 *               city:
 *                 type: string
 *                 example: Berlin
 *               lat:
 *                 type: number
 *                 example: 52.52
 *               lng:
 *                 type: number
 *                 example: 13.405
 *     responses:
 *       200:
 *         description: Newspaper edition generated successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Agent or API error
 */
export const agentRouter = Router();
agentRouter.post("/agent", agentHandler);
