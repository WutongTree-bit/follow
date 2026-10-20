// 这个行业的分类体系：类别、标签词表、公司（主体）名录，以及防止张冠李戴的身份词典。
// 模型按这里的词表打标签，主题页（topics.json）按标签归类，筛选栏按类别分组。
// 换行业时：类别的 key 会出现在网址里（/all?category=…），上线后就不要再改；标签和名录可以随时增减。

/**
 * 网页上的类别（筛选栏、卡片角标、RSS 分类订阅）。key 是网址和接口里的身份，上线后不要改。
 * section 是日报里的分节标题（几个类别可以共用一节，按这里的顺序排）；guide 告诉结构抽取模型这一类收什么、
 * 和相邻类别的边界在哪（总的归类原则写在 prompts/structure.md 里）。
 * commentary 标出评论类（教程、观点）：日报写过的事又有评论类的后续报道，只占一行快讯（报道它的信源够多时除外）。
 * 没归上类的资料在日报里放进第一个 key 为 industry 的类别所在的节（没有就放最后一节）。
 * tagColor 是飞书推送卡片里跟在标题后面的这一类小标签的颜色（飞书 text_tag 的颜色名）。
 * feedLabel 是分类 RSS 标题里的名字（不写就用 label）。公开接口、RSS 和 MCP 里要把一类并进另一类发布，写在站点设置里（site/site.ts 的 PUBLIC_CATEGORIES）。
 */
export const CATEGORIES = [
  { key: "capital", tagColor: "indigo", label: "股权资本", feedLabel: "股权与资本", section: "股权与资本", guide: "券商自身的股权结构与实际控制人变更、股东增持减持与股份转让、定增配股、次级债与公司债发行、对境内外子公司的增资与资本金注入。被投资的上市公司的股权变动不算；券商并购别的机构或被并购归并购与牌照。" },
  { key: "mna", tagColor: "turquoise", label: "并购牌照", feedLabel: "并购与牌照", section: "并购与牌照", guide: "券商之间的吸收合并、并购重组及其进展节点（筹划、获批、过户、完成）；同质化牌照清理、母子公司牌照归位；做市、碳交易、跨境业务等新业务资格的获批或取消。只有传闻且无公告或权威报道的，仍按已报道的阶段归类，不把传闻写成完成。" },
  { key: "regulation", tagColor: "red", label: "监管处罚", feedLabel: "监管与处罚", section: "监管与处罚", guide: "证监会及派出机构、交易所、中证协对券商及其人员的罚单、监管措施、纪律处分，影响券商业务边界的新规与征求意见稿，以及与处罚直接相关的合规总监任免。泛泛的宏观政策、对上市公司或基金公司的处罚不算，除非同一决定同时涉及券商。" },
  { key: "performance", tagColor: "orange", label: "业绩指标", feedLabel: "业绩与指标", section: "业绩与指标", guide: "单家券商或全行业的业绩快报、营收利润结构、自营与经纪业务表现、净资产收益率与排名，以及净资本、风险覆盖率、短期融资券与同业存单发行利率等流动性与信用指标。只是复述指数涨跌、成交额的行情稿不算。" },
  { key: "deals", tagColor: "violet", label: "投行资管", feedLabel: "投行与资管", section: "投行与资管", guide: "大型 ABS 与 REITs、IPO 保荐承销、再融资与并购财务顾问项目的获取、过会、发行与执行进展，以及券商资管、公募产品的重要产品与项目。无项目规模或进展的营销稿不算。" },
  { key: "people", tagColor: "purple", label: "人事组织", feedLabel: "人事与组织", section: "人事与招聘", guide: "董事长、总裁及高管的任免与更替，风控、合规、财务条线负责人变动，以及分支机构撤并、业务条线重组等组织架构调整。成建制的团队加盟或离开、保代与分析师流动归招聘与人才。" },
  { key: "recruit", tagColor: "green", label: "招聘人才", feedLabel: "招聘与人才", section: "人事与招聘", guide: "核心业务条线团队的成建制引进或流出、保荐代表人与分析师的人员流动、有规模和岗位范围的招聘与校招信息。没有岗位、规模或业务条线信息的泛泛招聘广告不算。" },
  { key: "procurement", tagColor: "yellow", label: "采购招标", feedLabel: "采购与招标", section: "科技与采购", guide: "券商的信息技术系统建设、数据服务、研究服务、软硬件等大额采购、招标、中标与比选公告，要能看出采购方、内容或金额之一。系统上线或技术成果的发布归金融科技。" },
  { key: "crossborder", tagColor: "blue", label: "跨境业务", feedLabel: "跨境业务", section: "跨境与国际化", guide: "香港与海外子公司的增资和业务布局、东南亚与中东等地的网点设立、跨境理财通、QFLP、沪深港通与互联互通相关业务资格和进展。券商自身的境外增资若主要是资本金注入，仍以跨境业务为主要类别。" },
  { key: "fintech", tagColor: "turquoise", label: "金融科技", feedLabel: "金融科技", section: "科技与采购", guide: "券商自研大模型的备案、智能投研与智能风控的场景落地、交易与清算系统的升级、数字化投入，以及监管对 AI 与数据使用的合规意见。采购与招标公告归采购招标。" },
  { key: "industry", tagColor: "orange", label: "行业", feedLabel: "行业动态", section: "行业动态", guide: "与券商行业有关、但不属于以上专门类别的已发生事件：行业整体格局、竞争与合作、协会与交易所的行业数据与活动、重大市场制度变化的行业影响。归不进其他类别、材料又不足时才用。" },
  { key: "opinion", tagColor: "purple", label: "评论解读", feedLabel: "评论与解读", section: "评论与解读", guide: "对券商行业事件的分析、解读、访谈与观点，重点是作者的判断和因果解释。当事券商或监管自己发布的公告不因带有态度而归评论；没有具体事件依托的行情点评与荐股不算。", commentary: true },
] as const satisfies ReadonlyArray<{ key: string; tagColor: string; label: string; feedLabel?: string; section: string; guide: string; commentary?: true }>;

/**
 * 这个行业最受关注的一类发布（AI 行业是新模型）：日报报头的“N 个新模型”、改分类后修订已出的报告都按它数。
 * category 是类别，tag 是标签，两者都对上才算；unit 接在数字后面。
 * 没有这样一类的行业设成 null，报头就不显示这个数。
 */
export const RELEASE: { category: string; tag: string; unit: string } | null = { category: "mna", tag: "并购重组", unit: "起并购重组" };

/** 周报月报的总述可以直接写、不必在报道里找到出处的行业通用词（小写）。站名会自动算进去。 */
export const PLAIN_TERMS: readonly string[] = ["ai", "ipo", "etf", "abs", "reits", "qfii", "qflp", "a股", "港股", "券商", "证券公司", "证监会", "交易所"];

/**
 * 内容理解一步给每篇资料判的“内容类型”（写在 prompts/content-understanding.md 里，改了类型要同步改那份提示词）。
 * 评分提示词（prompts/selection-score.md）按类型给五个维度不同的权重。
 */
export const ITEM_TYPES = ["corporate_action", "regulatory_action", "financial_result", "deal_project", "people_move", "business_move", "opinion_analysis"] as const;

// ── 标签词表 ────────────────────────────────────────────────────────────────────────────

/** 每篇资料的第一个标签必须是这些“分类标签”之一；最后一个是兜底。 */
export const CATEGORY_TAGS = [
  "股权变更", "增资/再融资", "并购重组", "牌照/资格", "监管处罚", "监管新规", "业绩/排名", "流动性/信用", "投行项目", "资管项目",
  "高管变动", "组织调整", "团队/人才", "招聘", "采购/招标", "跨境布局", "金融科技", "行业数据", "评论/解读", "行业动态", "其他",
] as const;

/** 可选的主题标签。 */
export const TOPIC_TAGS = [
  "自营", "经纪", "投行", "资管", "财富管理", "投研", "两融", "做市", "衍生品", "ETF/公募", "REITs/ABS", "IPO", "再融资", "债券/次级债",
  "港股/跨境", "合规风控", "大模型/AI", "分支机构", "信息系统", "科创板/北交所", "绿色金融",
] as const;

/** 可选的实体标签（头部券商、监管机构与行业组织）。 */
export const ENTITY_TAGS = [
  "中信证券", "中信建投", "国泰海通", "华泰证券", "中金公司", "招商证券", "广发证券", "申万宏源", "中国银河", "国信证券", "东方财富证券", "东方证券",
  "证监会", "上交所", "深交所", "北交所", "中证协", "基金业协会", "金融监管总局", "中国人民银行",
] as const;

/** 模型常写的近义词，统一成词表里的写法。 */
export const TAG_SYNONYMS: Readonly<Record<string, string>> = {
  股权结构: "股权变更", 实控人变更: "股权变更", 实际控制人变更: "股权变更", 控制权变更: "股权变更", 增持: "股权变更", 减持: "股权变更", 股东增减持: "股权变更", 股权转让: "股权变更",
  增资: "增资/再融资", 定增: "增资/再融资", 配股: "增资/再融资", 次级债: "增资/再融资", 融资: "增资/再融资", 资本金: "增资/再融资", 发债: "增资/再融资",
  并购: "并购重组", 重组: "并购重组", 吸收合并: "并购重组", 合并: "并购重组", 收购: "并购重组",
  牌照: "牌照/资格", 资格: "牌照/资格", 业务资格: "牌照/资格", 新业务资格: "牌照/资格",
  处罚: "监管处罚", 罚单: "监管处罚", 行政处罚: "监管处罚", 警示函: "监管处罚", 监管措施: "监管处罚", 纪律处分: "监管处罚",
  新规: "监管新规", 政策: "监管新规", 监管: "监管新规", 规则: "监管新规", "政策/监管": "监管新规", 征求意见: "监管新规",
  业绩: "业绩/排名", 业绩快报: "业绩/排名", 排名: "业绩/排名", 财报: "业绩/排名", 经营数据: "业绩/排名",
  流动性: "流动性/信用", 净资本: "流动性/信用", 风险覆盖率: "流动性/信用", 同业存单: "流动性/信用", 短融: "流动性/信用",
  保荐: "投行项目", 财务顾问: "投行项目", 承销: "投行项目",
  资管产品: "资管项目", 公募产品: "资管项目",
  高管: "高管变动", 人事: "高管变动", 人事变动: "高管变动", 任免: "高管变动", 董事长变更: "高管变动",
  组织架构: "组织调整", 架构调整: "组织调整", 撤并: "组织调整",
  人才: "团队/人才", 团队: "团队/人才", 团队加盟: "团队/人才", 保代: "团队/人才", 分析师流动: "团队/人才",
  招聘信息: "招聘", 校招: "招聘", 社招: "招聘",
  采购: "采购/招标", 招标: "采购/招标", 中标: "采购/招标", 比选: "采购/招标",
  跨境: "跨境布局", 出海: "跨境布局", 香港子公司: "跨境布局", 国际化: "跨境布局",
  科技: "金融科技", 数字化: "金融科技", 智能投研: "金融科技", 大模型备案: "金融科技",
  数据: "行业数据", 统计: "行业数据",
  评论: "评论/解读", 解读: "评论/解读", 观点: "评论/解读", 分析: "评论/解读",
  行业: "行业动态", 动态: "行业动态", 公司动态: "行业动态",
  AI: "大模型/AI", 大模型: "大模型/AI", 财富: "财富管理", 投资银行: "投行", 港股: "港股/跨境", 跨境业务: "港股/跨境", 衍生: "衍生品", 做市商: "做市", 北交所: "科创板/北交所", 科创板: "科创板/北交所",
  中国证监会: "证监会", 证监局: "证监会", 上海证券交易所: "上交所", 深圳证券交易所: "深交所", 北京证券交易所: "北交所", 中国证券业协会: "中证协", 证券业协会: "中证协",
  中国证券投资基金业协会: "基金业协会", 中基协: "基金业协会", 国家金融监督管理总局: "金融监管总局", 央行: "中国人民银行", 人民银行: "中国人民银行",
};

// ── 公司与主体 ──────────────────────────────────────────────────────────────────────────

/**
 * 公司主题：id → 显示名、卡片上显示的标签（null 表示只用 entity:<id> 归类）、别名。
 * aliases 给结构抽取模型看；orgNames 是这家公司发消息时开头用的组织名（公司、实验室、团队），
 * 在它自己的主题页上读者知道说的是谁，可以省去；otherNames 是公司的其他称呼（官方账号名、子品牌）。
 * 所有这些名字都用来认出说的是哪家公司，比如把事实的主体对到发布方。
 */
export const ENTITIES: Record<string, { name: string; displayTag: string | null; aliases: string[]; orgNames?: string[]; otherNames?: string[] }> = {
  citics: { name: "中信证券", displayTag: "中信证券", aliases: ["中信证券", "CITIC Securities"], orgNames: ["中信证券"], otherNames: ["中信证券研究", "中信证券财富管理", "中信证券投教基地"] },
  csc: { name: "中信建投证券", displayTag: "中信建投", aliases: ["中信建投证券", "中信建投"], orgNames: ["中信建投证券", "中信建投"], otherNames: ["中信建投期货"] },
  gtht: { name: "国泰海通", displayTag: "国泰海通", aliases: ["国泰海通", "国泰海通证券", "国泰君安", "国泰君安证券", "海通证券"], orgNames: ["国泰海通", "国泰君安", "海通证券"], otherNames: ["国泰海通君弘", "君弘", "国泰君安君弘"] },
  htsc: { name: "华泰证券", displayTag: "华泰证券", aliases: ["华泰证券"], orgNames: ["华泰证券", "华泰"], otherNames: ["华泰联合证券", "华泰证券资管", "华泰证券资产管理", "华泰资管", "华泰柏瑞"] },
  cicc: { name: "中金公司", displayTag: "中金公司", aliases: ["中金公司", "中国国际金融", "中金"], orgNames: ["中金公司", "中金"], otherNames: ["中金财富", "中金财富证券", "中金研究院"] },
  cmschina: { name: "招商证券", displayTag: "招商证券", aliases: ["招商证券"], orgNames: ["招商证券"], otherNames: ["招商研究", "招商证券投教基地", "招商证券智远理财", "智远理财"] },
  gf: { name: "广发证券", displayTag: "广发证券", aliases: ["广发证券"], orgNames: ["广发证券"], otherNames: ["广发证券95575"] },
  swhy: { name: "申万宏源", displayTag: "申万宏源", aliases: ["申万宏源", "申万宏源证券", "申万宏源集团"], orgNames: ["申万宏源", "申万宏源证券"], otherNames: ["申万宏源财富管理", "申万宏源承销保荐", "申万研究"] },
  galaxy: { name: "中国银河证券", displayTag: "中国银河", aliases: ["中国银河证券", "银河证券", "中国银河"], orgNames: ["中国银河证券", "中国银河", "银河证券"] },
  guosen: { name: "国信证券", displayTag: "国信证券", aliases: ["国信证券"], orgNames: ["国信证券"] },
  "eastmoney-sec": { name: "东方财富证券", displayTag: "东方财富证券", aliases: ["东方财富证券", "东财证券"], orgNames: ["东方财富证券"], otherNames: ["东方财富"] },
  orient: { name: "东方证券", displayTag: "东方证券", aliases: ["东方证券"], orgNames: ["东方证券"], otherNames: ["东证资管", "东方证券资管"] },
  everbright: { name: "光大证券", displayTag: null, aliases: ["光大证券"], orgNames: ["光大证券"], otherNames: ["光大证券微资讯"] },
  pingan: { name: "平安证券", displayTag: null, aliases: ["平安证券"], orgNames: ["平安证券"] },
  cjsc: { name: "长江证券", displayTag: null, aliases: ["长江证券"], orgNames: ["长江证券"], otherNames: ["长江证券财富管理", "长江证券文化在线", "长江证券投教基地"] },
  "sdic-sec": { name: "国投证券", displayTag: null, aliases: ["国投证券", "安信证券"], orgNames: ["国投证券", "安信证券"] },
  glms: { name: "国联民生", displayTag: null, aliases: ["国联民生", "国联民生证券", "国联证券", "民生证券"], orgNames: ["国联民生", "国联证券", "民生证券"] },
  sinolink: { name: "国金证券", displayTag: null, aliases: ["国金证券"], orgNames: ["国金证券"] },
  soochow: { name: "东吴证券", displayTag: null, aliases: ["东吴证券"], orgNames: ["东吴证券"] },
  founder: { name: "方正证券", displayTag: null, aliases: ["方正证券"], orgNames: ["方正证券"] },
  xyzq: { name: "兴业证券", displayTag: null, aliases: ["兴业证券"], orgNames: ["兴业证券"] },
  zszq: { name: "中泰证券", displayTag: null, aliases: ["中泰证券"], orgNames: ["中泰证券"] },
  zheshang: { name: "浙商证券", displayTag: null, aliases: ["浙商证券"], orgNames: ["浙商证券"] },
  cgws: { name: "长城证券", displayTag: null, aliases: ["长城证券"], orgNames: ["长城证券"] },
  ctsec: { name: "财通证券", displayTag: null, aliases: ["财通证券"], orgNames: ["财通证券"] },
  tfzq: { name: "天风证券", displayTag: null, aliases: ["天风证券"], orgNames: ["天风证券"] },
  hazq: { name: "华安证券", displayTag: null, aliases: ["华安证券"], orgNames: ["华安证券"] },
  gyzq: { name: "国元证券", displayTag: null, aliases: ["国元证券"], orgNames: ["国元证券"] },
  westsec: { name: "西部证券", displayTag: null, aliases: ["西部证券"], orgNames: ["西部证券"] },
  kysec: { name: "开源证券", displayTag: null, aliases: ["开源证券"], orgNames: ["开源证券"] },
  hxzq: { name: "华西证券", displayTag: null, aliases: ["华西证券"], orgNames: ["华西证券"] },
  dxzq: { name: "东兴证券", displayTag: null, aliases: ["东兴证券"], orgNames: ["东兴证券"] },
  cindasc: { name: "信达证券", displayTag: null, aliases: ["信达证券"], orgNames: ["信达证券"] },
  sgsec: { name: "申港证券", displayTag: null, aliases: ["申港证券"], orgNames: ["申港证券"] },
  cxzq: { name: "财信证券", displayTag: null, aliases: ["财信证券"], orgNames: ["财信证券"] },
  "ubs-sec": { name: "瑞银证券", displayTag: null, aliases: ["瑞银证券"], orgNames: ["瑞银证券"] },
};

/**
 * 身份词典：摘要和标题里出现的公司，必须在原文里也出现过，否则退回原标题、丢掉摘要（防止模型张冠李戴）。
 * 行业没有这个问题时可以留空数组。
 */
export const IDENTITY_LEXICON: ReadonlyArray<{ id: string; name: string; patterns: RegExp[] }> = [
  { id: "citics", name: "中信证券", patterns: [/中信证券|citic\s?securities/i] },
  { id: "csc", name: "中信建投", patterns: [/中信建投/] },
  { id: "gtht", name: "国泰海通", patterns: [/国泰海通|国泰君安|海通证券/] },
  { id: "htsc", name: "华泰证券", patterns: [/华泰(?:证券|联合|资管|柏瑞)?/] },
  { id: "cicc", name: "中金公司", patterns: [/中金(?:公司|财富|研究院)|中国国际金融/] },
  { id: "cmschina", name: "招商证券", patterns: [/招商证券|招商研究|智远理财/] },
  { id: "gf", name: "广发证券", patterns: [/广发证券/] },
  { id: "swhy", name: "申万宏源", patterns: [/申万宏源|申万研究/] },
  { id: "galaxy", name: "中国银河证券", patterns: [/银河证券|中国银河/] },
  { id: "guosen", name: "国信证券", patterns: [/国信证券/] },
  { id: "eastmoney-sec", name: "东方财富证券", patterns: [/东方财富|东财证券/] },
  { id: "orient", name: "东方证券", patterns: [/东方证券|东证资管/] },
  { id: "everbright", name: "光大证券", patterns: [/光大证券/] },
  { id: "pingan", name: "平安证券", patterns: [/平安证券/] },
  { id: "cjsc", name: "长江证券", patterns: [/长江证券/] },
  { id: "sdic-sec", name: "国投证券", patterns: [/国投证券|安信证券/] },
  { id: "glms", name: "国联民生", patterns: [/国联民生|国联证券|民生证券/] },
  { id: "sinolink", name: "国金证券", patterns: [/国金证券/] },
  { id: "soochow", name: "东吴证券", patterns: [/东吴证券/] },
  { id: "founder", name: "方正证券", patterns: [/方正证券/] },
  { id: "xyzq", name: "兴业证券", patterns: [/兴业证券/] },
  { id: "zszq", name: "中泰证券", patterns: [/中泰证券/] },
  { id: "zheshang", name: "浙商证券", patterns: [/浙商证券/] },
  { id: "cgws", name: "长城证券", patterns: [/长城证券/] },
  { id: "ctsec", name: "财通证券", patterns: [/财通证券/] },
  { id: "tfzq", name: "天风证券", patterns: [/天风证券/] },
  { id: "hazq", name: "华安证券", patterns: [/华安证券/] },
  { id: "gyzq", name: "国元证券", patterns: [/国元证券/] },
  { id: "westsec", name: "西部证券", patterns: [/西部证券/] },
  { id: "kysec", name: "开源证券", patterns: [/开源证券/] },
  { id: "hxzq", name: "华西证券", patterns: [/华西证券/] },
  { id: "dxzq", name: "东兴证券", patterns: [/东兴证券/] },
  { id: "cindasc", name: "信达证券", patterns: [/信达证券/] },
  { id: "sgsec", name: "申港证券", patterns: [/申港证券/] },
  { id: "cxzq", name: "财信证券", patterns: [/财信证券/] },
  { id: "ubs-sec", name: "瑞银证券", patterns: [/瑞银证券/] },
];

/** 这些域名上的文章，发布方就是对应的公司（托管平台、聚合站不算）。 */
export const PUBLISHER_DOMAINS: ReadonlyArray<{ entityId: string; domains: readonly string[] }> = [
  { entityId: "citics", domains: ["cs.ecitic.com"] },
  { entityId: "csc", domains: ["csc108.com"] },
  { entityId: "gtht", domains: ["gtja.com", "htsec.com"] },
  { entityId: "htsc", domains: ["htsc.com.cn"] },
  { entityId: "cicc", domains: ["cicc.com"] },
  { entityId: "cmschina", domains: ["cmschina.com"] },
  { entityId: "gf", domains: ["gf.com.cn"] },
  { entityId: "swhy", domains: ["swhysc.com"] },
  { entityId: "galaxy", domains: ["chinastock.com.cn"] },
  { entityId: "guosen", domains: ["guosen.com.cn"] },
  { entityId: "orient", domains: ["dfzq.com.cn"] },
  { entityId: "everbright", domains: ["ebscn.com"] },
];

/** 原文里的这些写法也算提到了对应公司。 */
export const IDENTITY_CONTEXT_ALIASES: ReadonlyArray<{ entityId: string; pattern: RegExp }> = [];
