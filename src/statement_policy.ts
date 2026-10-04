export type LearnerDeadline = {
  learnerId: string;
  completedAt?: string;
  dueAt: string;
};

export type DeliverySummary = {
  delivered: number;
  completed: number;
  overdue: number;
  overdueLearnerIds: string[];
};

export function summarizeDelivery(
  learners: LearnerDeadline[],
  periodEnd: string,
): DeliverySummary {
  const cutoff = Date.parse(periodEnd);
  const overdueLearnerIds = learners
    .filter((learner) => !learner.completedAt && Date.parse(learner.dueAt) <= cutoff)
    .map((learner) => learner.learnerId)
    .sort();

  return {
    delivered: learners.length,
    completed: learners.filter((learner) => learner.completedAt !== undefined).length,
    overdue: overdueLearnerIds.length,
    overdueLearnerIds,
  };
}
