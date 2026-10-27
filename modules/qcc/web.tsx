// The qcc module on the web: the 券商档案 entries, the admin's 企查查 MCP page and the card on company topic pages.
import { defineWebModule } from "../../apps/web/app/modules.ts";
import { IconUsers } from "../../apps/web/app/components/icons.tsx";

export const web = defineWebModule({
  name: "qcc",
  sidebar: { section: "数据", items: [{ to: "/brokers", label: "券商档案", icon: IconUsers }] },
  tools: [{ to: "/brokers", label: "券商档案", icon: <IconUsers size={20} /> }],
  admin: { groups: [{ group: "数据", items: [{ to: "/admin/qcc", label: "企查查 MCP" }] }] },
  topicPage: () => import("./web/TopicCard.tsx"),
});
