import express from "express";
import cors from "cors";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { agentRouter } from "#routers";
import { errorMiddleware } from "#middlewares";

const app = express();
app.use(cors());
app.use(express.json());

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: { title: "CityPaper API", version: "1.0.0" },
  },
  apis: ["./src/routers/*.ts", "./dist/routers/*.js"],
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/", agentRouter);
app.use(errorMiddleware);

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => console.log(`CityPaper backend running on port ${PORT}`));

export default app;
