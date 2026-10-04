import { z } from "zod";
import { InfraiClient } from "./infrai_client.ts";
import { summarizeDelivery } from "./statement_policy.ts";
import type { LearnerDeadline } from "./statement_policy.ts";

export const statementRequestSchema = z.object({
  requestId: z.string().min(8),
  customer: z.object({ name: z.string().min(1), email: z.string().email() }),
  course: z.object({ id: z.string().min(1), title: z.string().min(1) }),
  period: z.object({ label: z.string().min(1), endsAt: z.string().datetime() }),
  learners: z.array(z.object({
    learnerId: z.string().min(1),
    dueAt: z.string().datetime(),
    completedAt: z.string().datetime().optional(),
  })),
});

export type StatementRequest = z.infer<typeof statementRequestSchema>;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] as string);
}

export async function sendMonthlyStatement(input: StatementRequest, infrai: InfraiClient) {
  const delivery = summarizeDelivery(input.learners as LearnerDeadline[], input.period.endsAt);
  const metering = await infrai.accountUsage();
  const meteringText = JSON.stringify(metering, null, 2);
  const title = `${input.period.label} usage statement - ${input.course.title}`;
  const markdown = [
    `# ${title}`,
    `Customer: ${input.customer.name}`,
    `Course ID: ${input.course.id}`,
    `Delivered: ${delivery.delivered}`,
    `Completed: ${delivery.completed}`,
    `Overdue at period close: ${delivery.overdue}`,
    "## Account usage",
    "```json",
    meteringText,
    "```",
  ].join("\n\n");
  const html = `<h1>${escapeHtml(title)}</h1><p>Customer: ${escapeHtml(input.customer.name)}</p><ul><li>Delivered: ${delivery.delivered}</li><li>Completed: ${delivery.completed}</li><li>Overdue at period close: ${delivery.overdue}</li></ul><h2>Account usage</h2><pre>${escapeHtml(meteringText)}</pre>`;

  const pdf = await infrai.generatePdf(markdown, input.requestId);
  const email = await infrai.sendEmail(input.customer.email, title, html, input.requestId);
  return { delivery, pdf, messageId: email.message_id };
}
