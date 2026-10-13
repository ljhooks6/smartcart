import { handleCallback } from "@vercel/queue";
import { z } from "zod";
import { NotificationRetry, processAdminApplicationNotification } from "@/lib/beta-application-notifications";
export const maxDuration = 60;
export const POST = handleCallback(async (message: unknown) => {
  const parsed = z.object({ applicationId: z.string().uuid() }).strict().safeParse(message);
  if (parsed.success) await processAdminApplicationNotification(parsed.data.applicationId);
}, { retry: (error, metadata) => metadata.deliveryCount >= 10 ? { acknowledge: true } : { afterSeconds: error instanceof NotificationRetry ? error.afterSeconds : 60 } }) as (request: Request) => Promise<Response>;
