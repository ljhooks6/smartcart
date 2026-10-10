import { send } from "@vercel/queue";
import { after } from "next/server";
import { processGenerationJob } from "./generation-worker";

export async function dispatchGenerationJob(id: string) {
  if (process.env.VERCEL) {
    await send("mealcaddie-plans", { jobId: id }, { idempotencyKey: `plan:${id}`, retentionSeconds: 3600 });
    return;
  }
  // Local preview uses the same persisted job/worker. Vercel production always uses the durable queue.
  after(async () => {
    try { await processGenerationJob(id); } catch { /* A later status poll can resume queued local work. */ }
  });
}
