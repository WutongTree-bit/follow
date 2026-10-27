-- 详情页三个标签（企业数据、法律数据、标讯数据）各自最近一次拉到的内容。
-- json 而不是 jsonb：保留企查查给出的字段顺序（表格的列、登记信息的先后）。
CREATE TABLE IF NOT EXISTS qcc_sections (
  slug text NOT NULL,
  tab text NOT NULL,
  blocks json NOT NULL DEFAULT '[]',
  fetched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (slug, tab)
);
