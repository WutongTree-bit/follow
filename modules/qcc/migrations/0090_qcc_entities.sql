-- 每家券商（公司主题）在企查查里对应的工商主体，以及它的数据最近一次拉取的状态。
CREATE TABLE IF NOT EXISTS qcc_entities (
  slug text PRIMARY KEY,
  status text NOT NULL DEFAULT 'unresolved',
  name text,
  credit_code text,
  candidates jsonb NOT NULL DEFAULT '[]',
  suggested text,
  confirmed_by text,
  requested_at timestamptz,
  fetched_at timestamptz,
  last_error text,
  overview jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
