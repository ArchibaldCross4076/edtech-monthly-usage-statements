import { createServer } from "node:http";
import { ZodError } from "zod";
import { InfraiClient, InfraiError } from "./infrai_client.ts";
import { sendMonthlyStatement, statementRequestSchema } from "./monthly_statement.ts";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service");
const infrai = new InfraiClient(apiKey);

async function readJson(request: import("node:http").IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const server = createServer(async (request, response) => {
  response.setHeader("Content-Type", "application/json");
  if (request.method !== "POST" || request.url !== "/statements") {
    response.writeHead(404).end(JSON.stringify({ error: "Route not found" }));
    return;
  }

  try {
    const input = statementRequestSchema.parse(await readJson(request));
    const result = await sendMonthlyStatement(input, infrai);
    response.writeHead(201).end(JSON.stringify(result));
  } catch (error) {
    if (error instanceof ZodError) {
      response.writeHead(400).end(JSON.stringify({ error: "Invalid statement request", issues: error.issues }));
      return;
    }
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      response.writeHead(status).end(JSON.stringify({ error: error.code, detail: error.detail }));
      return;
    }
    response.writeHead(500).end(JSON.stringify({ error: "Statement request could not be completed" }));
  }
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => console.log(`Statement service listening on http://localhost:${port}`));
