import assert from "node:assert/strict";
import test from "node:test";
import { scheduleCourseReminders, type CronCreator } from "../src/course_reminders.js";

test("assigns the learner reminder and educator report to their own schedules", async () => {
  const calls: Array<{ cronExpr: string; task: string; key: string }> = [];
  const createCron: CronCreator = async (cronExpr, task, key) => {
    calls.push({ cronExpr, task, key });
    return { job_id: `job-${calls.length}` };
  };

  const result = await scheduleCourseReminders({
    courseId: "agents-101",
    learnerDeadline: {
      cronExpr: "0 9 * * 1",
      notificationUrl: "https://school.example/notify-learners"
    },
    educatorReport: {
      cronExpr: "0 10 * * 1",
      reportingUrl: "https://school.example/report-to-educators"
    }
  }, createCron);

  assert.deepEqual(calls, [
    {
      cronExpr: "0 9 * * 1",
      task: "https://school.example/notify-learners",
      key: "course:agents-101:learner-deadline"
    },
    {
      cronExpr: "0 10 * * 1",
      task: "https://school.example/report-to-educators",
      key: "course:agents-101:educator-report"
    }
  ]);
  assert.deepEqual(result, {
    courseId: "agents-101",
    learnerReminderJobId: "job-1",
    educatorReportJobId: "job-2"
  });
});
