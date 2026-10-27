// The qcc module on the web: the admin's 企查查 MCP page, the broker list on the topics page and the card on company topic pages.
import { defineWebModule } from "../../apps/web/app/modules.ts";

export const web = defineWebModule({
  name: "qcc",
  admin: { groups: [{ group: "数据", items: [{ to: "/admin/qcc", label: "企查查 MCP" }] }] },
  topicPage: () => import("./web/TopicCard.tsx"),
  topicsGroup: () => import("./web/BrokerList.tsx"),
});
