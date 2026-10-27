// The broker's card on its topic page: the headline facts and a way to its 券商档案.
import { Link } from "react-router";
import type { TopicPagePart } from "../../../apps/web/app/modules.ts";
import { IconChevronRight } from "../../../apps/web/app/components/icons.tsx";
import type { QccTopicPart } from "../contract.ts";
import { OverviewTiles } from "./Overview.tsx";

function Card({ data, topic }: { data: unknown; topic: { slug: string; name: string } }) {
  const part = data as QccTopicPart;
  return (
    <section className="card px-4 py-4 lg:px-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-ink">工商档案</h2>
          <p className="mt-0.5 truncate text-[12.5px] text-ink-4">{part.registeredName ?? "企业、法律与标讯数据，来自企查查"}</p>
        </div>
        <Link to={`/brokers/${topic.slug}`} className="inline-flex items-center gap-1 text-[13px] font-medium text-accent hover:underline">
          查看{topic.name}档案 <IconChevronRight size={14} />
        </Link>
      </div>
      {part.overview && <div className="mt-3"><OverviewTiles overview={part.overview} compact /></div>}
    </section>
  );
}

const part: TopicPagePart = {
  name: "工商档案",
  shows: (data) => !!data && (data as QccTopicPart).status !== "missing",
  Block: Card,
  entries: () => [],
  news: () => [],
};

export default part;
