import assert from "node:assert/strict";
import test from "node:test";
import { summarizeDelivery } from "../src/statement_policy.ts";

test("marks only incomplete learners due by the statement close as overdue", () => {
  const summary = summarizeDelivery([
    { learnerId: "completed", dueAt: "2026-08-10T00:00:00.000Z", completedAt: "2026-08-09T00:00:00.000Z" },
    { learnerId: "late", dueAt: "2026-08-20T00:00:00.000Z" },
    { learnerId: "next-month", dueAt: "2026-09-02T00:00:00.000Z" },
  ], "2026-08-31T23:59:59.000Z");

  assert.deepEqual(summary, {
    delivered: 3,
    completed: 1,
    overdue: 1,
    overdueLearnerIds: ["late"],
  });
});
