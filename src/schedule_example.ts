import { reminderRequestSchema, scheduleCourseReminders } from "./course_reminders.js";
import { infrai } from "./infrai_cron.js";

const request = reminderRequestSchema.parse({
  courseId: "ml-systems-2026",
  learnerDeadline: {
    cronExpr: "0 9 * * 1",
    notificationUrl: "https://school.example/webhooks/learner-deadline"
  },
  educatorReport: {
    cronExpr: "0 10 * * 1",
    reportingUrl: "https://school.example/webhooks/educator-report"
  }
});

console.log(await scheduleCourseReminders(request, infrai.cron.create));
