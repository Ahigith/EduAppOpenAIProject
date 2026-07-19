# Production smoke checklist

1. Open the deployed home page. Confirm the anonymous session starts, the topic grid loads, and the current XP total is visible.
2. Open **Business Model T1**. Complete the sort-buckets activity, submit it, and confirm the result, XP award, and badge/completion state appear.
3. Open **Product Pipeline T1**. Arrange the steps, submit the sequence, and confirm the result and completion state.
4. Open **Industry T1**. Take at least two narrative decisions, confirming a debrief appears after each choice and the final decision completes the level.
5. Open **Pitching T1**. Send a complete conversation through the closing turn, then confirm the scored evaluation, feedback, and one-time XP behavior.
6. Open **Finance T2 — Build the Model**. Complete every builder field within its character limit, submit, and confirm either scored results or the pending-review state.
7. Return to the map. Confirm total XP and badges match completed levels, Finance T2 is available when its Finance T1 prerequisite is complete, and Industry T2 is available after Industry T1 is complete.
8. Refresh the browser. Confirm session, completed states, XP, badges, unlock states, and in-progress data persist.
9. Open `/api/health`. Confirm it returns HTTP 200 with `{ "ok": true, "dbConnected": true, "contentLevels": 5 }` (or the current authored content count).
