// 券商档案：企查查 MCP 的工商、法律与标讯数据（README.md）。
import { defineModule } from "@aihot/contracts/modules";

export const module = defineModule({
  name: "qcc",
  pages: [
    { path: "brokers/:slug", file: "web/routes/broker.tsx", id: "qcc-broker" },
  ],
  adminPages: [{ path: "admin/qcc", file: "web/routes/admin.tsx", id: "qcc-admin" }],
});
