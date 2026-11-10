import { z } from "zod";

export const reminderRequestSchema = z.object({
  courseId: z.string().min(1),
  learnerDeadline: z.object({
    cronExpr: z.string().min(1),
    notificationUrl: z.string().url()
  }),
  educatorReport: z.object({
    cronExpr: z.string().min(1),
    reportingUrl: z.string().url()
  })
}).strict();

export type ReminderRequest = z.infer<typeof reminderRequestSchema>;

export type CronCreator = (
  cronExpr: string,
  task: string,
  idempotencyKey: string
) => Promise<{ job_id: string }>;

export interface ReminderSchedule {
  courseId: string;
  learnerReminderJobId: string;
  educatorReportJobId: string;
}

export async function scheduleCourseReminders(
  request: ReminderRequest,
  createCron: CronCreator
): Promise<ReminderSchedule> {
  const learnerJob = await createCron(
    request.learnerDeadline.cronExpr,
    request.learnerDeadline.notificationUrl,
    `course:${request.courseId}:learner-deadline`
  );
  const educatorJob = await createCron(
    request.educatorReport.cronExpr,
    request.educatorReport.reportingUrl,
    `course:${request.courseId}:educator-report`
  );

  return {
    courseId: request.courseId,
    learnerReminderJobId: learnerJob.job_id,
    educatorReportJobId: educatorJob.job_id
  };
}
