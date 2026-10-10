import { handleCallback } from "@vercel/queue";
import { z } from "zod";
import { GenerationBusyError, processGenerationJob } from "@/lib/generation-worker";

export const maxDuration = 300;
export const POST = handleCallback(async (message: unknown) => {
  const parsed = z.object({ jobId: z.string().uuid() }).safeParse(message);
  if (!parsed.success) return;
  await processGenerationJob(parsed.data.jobId);
}, {
  retry: (error) => ({ afterSeconds: error instanceof GenerationBusyError ? error.afterSeconds + Math.floor(Math.random()*10) : 60 }),
}) as (request: Request) => Promise<Response>;
