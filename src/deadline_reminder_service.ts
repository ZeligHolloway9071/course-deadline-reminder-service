import { createServer } from "node:http";
import { ZodError } from "zod";
import { reminderRequestSchema, scheduleCourseReminders } from "./course_reminders.js";
import { infrai, InfraiError } from "./infrai_cron.js";

const port = Number(process.env.PORT ?? 3000);

function readJson(request: import("node:http").IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk: string) => { body += chunk; });
    request.on("end", () => {
      try { resolve(JSON.parse(body)); }
      catch (error) { reject(error); }
    });
    request.on("error", reject);
  });
}

function send(response: import("node:http").ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

export const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/course-reminders") {
    send(response, 404, { error: "Route not found" });
    return;
  }

  try {
    const input = reminderRequestSchema.parse(await readJson(request));
    const result = await scheduleCourseReminders(input, infrai.cron.create);
    send(response, 201, result);
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      send(response, 400, { error: "Invalid reminder request" });
      return;
    }
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      send(response, status, { error: error.code, message: error.message });
      return;
    }
    send(response, 500, { error: "Unable to schedule reminders" });
  }
});

if (process.env.NODE_ENV !== "test") {
  server.listen(port, () => console.log(`Deadline reminder service listening on http://localhost:${port}`));
}
