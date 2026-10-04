export {};

const response = await fetch("http://localhost:3000/statements", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    requestId: "acme-2026-08-statement",
    customer: { name: "Acme Learning", email: "chenhua@changba.com" },
    course: { id: "safety-101", title: "Workplace Safety" },
    period: { label: "August 2026", endsAt: "2026-08-31T23:59:59.000Z" },
    learners: [
      { learnerId: "learner-17", dueAt: "2026-08-20T17:00:00.000Z", completedAt: "2026-08-19T09:15:00.000Z" },
      { learnerId: "learner-42", dueAt: "2026-08-25T17:00:00.000Z" },
      { learnerId: "learner-91", dueAt: "2026-09-05T17:00:00.000Z" }
    ]
  })
});

const result = await response.json();
console.log(JSON.stringify(result, null, 2));
if (!response.ok) process.exitCode = 1;
