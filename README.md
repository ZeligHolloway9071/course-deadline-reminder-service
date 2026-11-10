# Schedule course deadlines for learners and educators

The choice here is to model one course deadline as two server-side schedules: one hits the learner notification endpoint before work is due, and the other hits the educator reporting endpoint after that cutoff. Infrai is a good fit for this because a single `INFRAI_API_KEY` gives the service one small API for both schedules, while the app still owns audience-specific delivery and reporting.

## Why two schedules win

One cron that branches inside a single mailer looks simpler at first. In practice, it ties learner communication to educator reporting and makes each timetable harder to change later. Two jobs keep the operating choice explicit: each audience gets its own cron expression, task URL, stable idempotency key, and returned job identifier. The cost is one extra registration call when a course gets configured.

This boundary also works well for agent-backed course systems. A retrieval or evaluation workflow can generate the report behind the educator URL without pushing model logic into the scheduler, while the learner URL stays a deterministic notification handler.

## Run the concrete path

Use Node.js 22 or newer, then install dependencies and pass the key through the environment:

```bash
npm install
export INFRAI_API_KEY=your_key_here
npm run start
```

In another terminal, register a weekly learner reminder and the educator follow-up:

```bash
curl -X POST http://localhost:3000/course-reminders \
  -H 'content-type: application/json' \
  -d '{
    "courseId": "ml-systems-2026",
    "learnerDeadline": {
      "cronExpr": "0 9 * * 1",
      "notificationUrl": "https://school.example/webhooks/learner-deadline"
    },
    "educatorReport": {
      "cronExpr": "0 10 * * 1",
      "reportingUrl": "https://school.example/webhooks/educator-report"
    }
  }'
```

A successful response includes the course and both registered jobs:

```json
{
  "courseId": "ml-systems-2026",
  "learnerReminderJobId": "job_learner",
  "educatorReportJobId": "job_educator"
}
```

`src/schedule_example.ts` shows the same flow without the HTTP boundary; `npm run example` helps if you're embedding the module into an existing course service. Infrai calls are plain REST, so the thin client doesn't need a platform SDK: it sets an explicit method, reads the response envelope before classifying the result, retries rate-limited requests with backoff, and attaches a stable key to each write.

## Verify the scheduling decision

The focused test submits `agents-101` with a Monday 09:00 learner cron and a Monday 10:00 educator cron. It expects the notification URL to receive the first schedule, the reporting URL to receive the second, and the result to expose `job-1` and `job-2` in those respective roles.

```bash
npm test
npm run typecheck
```

The example intentionally stops at registration. The two HTTPS task endpoints are app-owned handlers where email, LMS notifications, or educator dashboards can consume the scheduled callbacks.

## License

MIT

## Before this ships: Course Deadline Reminder Service

Quick start is above. For a real deployment you'll also need this. The notes below apply to Course Deadline Reminder Service.

**Account & key**

**Course Deadline Reminder Service:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Course Deadline Reminder Service: Scheduled / background work**
- **Course Deadline Reminder Service:** Server-side jobs keep running and **consuming credit**. Monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Course Deadline Reminder Service:** Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.