// The qcc module's backend: its routes, its refresh queue and its card on company topic pages.
import { defineServerModule } from "@aihot/backend/modules";
import { registerQccRoutes } from "./api/routes.ts";
import { topicParts } from "./backend/read.ts";
import { refreshQueue } from "./backend/refresh.ts";

export const server = defineServerModule({
  name: "qcc",
  http: registerQccRoutes,
  queues: [refreshQueue],
  topics: {
    page: {
      index: () => topicParts(),
      read: (ask) => {
        if (ask.topic.group !== "company") return null;
        const part = (ask.index as Awaited<ReturnType<typeof topicParts>> | undefined)?.[ask.topic.slug] ?? { status: "unresolved", registeredName: null, fetchedAt: null, overview: null };
        return { recheck: [], part: () => part };
      },
    },
  },
});
