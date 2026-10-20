// 其余国内证券公司：除 taxonomy.ts 里手工维护的头部券商之外，每家一个“公司”主题（/topics/<id>）。
// 名单来自中国证券业协会“证券公司网站链接”（2025-12-31 更新，含官网），资管、承销保荐子公司并进母公司的“其他称呼”。
// 新增或更名一家券商：在这里加一行（id 上线后不要改），再在 topics.json 里加一行同 id 的公司主题，然后重新构建；
// tests/industry-pack.test.ts 会检查两边是否一致、名字是否有歧义。

export interface Broker {
  /** 主题的网址和主体 id，小写字母、数字和连字符。 */
  id: string;
  /** 常用简称，也是主题页上的名字。 */
  name: string;
  /** 报道里常用的其他写法。 */
  aliases?: string[];
  /** 子公司（资管、承销保荐）和曾用名，把新闻的主体对到这家公司时也认它们。 */
  otherNames?: string[];
  /** 官网域名：这些域名上的文章，发布方就是这家公司。 */
  domains?: string[];
  /** 外资控股券商（主题简介的写法不同）。 */
  foreign?: boolean;
  /** 身份词典里的写法，默认由名称拼出；名称是别的词的一部分时才写。 */
  lexicon?: RegExp;
}

export const OTHER_BROKERS: readonly Broker[] = [
  { id: "ajzq", name: "爱建证券", domains: ["ajzq.com"] },
  { id: "gaohua", name: "北京高华证券", aliases: ["高盛高华"], domains: ["gaohuasec.com"], foreign: true },
  { id: "bohai", name: "渤海证券", otherNames: ["渤海汇金证券资产管理", "渤海汇金"], domains: ["ewww.com.cn"] },
  { id: "caida", name: "财达证券", domains: ["s10000.com"] },
  { id: "cgrz", name: "长城国瑞证券", domains: ["gwgsc.com"] },
  { id: "chuancai", name: "川财证券", domains: ["cczq.com"] },
  { id: "daiwa", name: "大和证券（中国）", aliases: ["大和证券"], domains: ["daiwa.cn"], foreign: true },
  // “摩根大通证券”里也有“大通证券”，身份词典里要排除。
  { id: "dtzq", name: "大通证券", domains: ["daton.com.cn"], lexicon: /(?<!摩根)大通证券/ },
  { id: "dtsec", name: "大同证券", domains: ["dtsbc.com.cn"] },
  { id: "debon", name: "德邦证券", otherNames: ["德邦证券资产管理", "德邦资管"], domains: ["tebon.com.cn"] },
  { id: "fcsc", name: "第一创业证券", aliases: ["第一创业"], otherNames: ["第一创业证券承销保荐"], domains: ["fcsc.cn"] },
  { id: "nesc", name: "东北证券", domains: ["nesc.cn"] },
  { id: "donghai", name: "东海证券", domains: ["longone.com.cn"] },
  { id: "dgzq", name: "东莞证券", domains: ["dgzq.com.cn"] },
  { id: "beaqh", name: "东亚前海证券", domains: ["easec.com.cn"], foreign: true },
  { id: "bnpp", name: "法巴证券（中国）", aliases: ["法巴证券"], domains: ["bnpparibas-sec.cn"], foreign: true },
  { id: "gs-china", name: "高盛（中国）证券", aliases: ["高盛中国"], domains: ["goldmansachs.cn"], foreign: true },
  { id: "guodu", name: "国都证券", domains: ["guodu.com"] },
  { id: "ghzq", name: "国海证券", domains: ["ghzq.com.cn"] },
  { id: "cdb-sec", name: "国开证券", domains: ["gkzq.com.cn"] },
  { id: "grzq", name: "国融证券", domains: ["grzq.com"] },
  { id: "gszq", name: "国盛证券", otherNames: ["国盛证券资产管理", "国盛资管"], domains: ["gszq.com"] },
  { id: "gxzq", name: "国新证券", domains: ["crsec.com.cn"] },
  { id: "htcc", name: "恒泰长财证券", domains: ["cczq.net"] },
  { id: "hengtai", name: "恒泰证券", domains: ["cnht.com.cn"] },
  { id: "hongta", name: "红塔证券", domains: ["hongtastock.com"] },
  { id: "hongxin", name: "宏信证券", domains: ["hxzq.cn"] },
  { id: "huabao", name: "华宝证券", domains: ["cnhbstock.com"] },
  { id: "hczq", name: "华创证券", domains: ["hczq.com"] },
  { id: "huafu", name: "华福证券", domains: ["hfzq.com.cn"] },
  { id: "huajin", name: "华金证券", domains: ["huajinsc.cn"] },
  { id: "hualin", name: "华林证券", domains: ["chinalions.com"] },
  { id: "hualong", name: "华龙证券", domains: ["hlzq.com"] },
  { id: "huaxin", name: "华鑫证券", domains: ["cfsc.com.cn"] },
  { id: "huaxing", name: "华兴证券", domains: ["huajingsec.com"] },
  { id: "huaying", name: "华英证券", domains: ["huayingsc.com"] },
  { id: "huayuan", name: "华源证券", domains: ["jzsec.com"] },
  { id: "hsbc-qh", name: "汇丰前海证券", domains: ["hsbcqh.com.cn"], foreign: true },
  { id: "jhzq", name: "江海证券", domains: ["jhzq.com.cn"] },
  { id: "jintong", name: "金通证券" },
  { id: "jinyuan", name: "金元证券", domains: ["jyzq.cn"] },
  { id: "jyty", name: "金圆统一证券", domains: ["jypscnet.com"] },
  { id: "lianchu", name: "联储证券", domains: ["lczq.com"] },
  { id: "maigao", name: "麦高证券", domains: ["mgzq.com"] },
  { id: "jpm-china", name: "摩根大通证券（中国）", aliases: ["摩根大通证券"], domains: ["jpmorganchina.com"], foreign: true },
  { id: "ms-china", name: "摩根士丹利证券（中国）", aliases: ["摩根士丹利证券", "摩根士丹利华鑫证券"], domains: ["morganstanleyhuaxin.com"], foreign: true },
  { id: "njzq", name: "南京证券", domains: ["njzq.com.cn"] },
  { id: "cs-china", name: "瑞信证券（中国）", aliases: ["瑞信证券(中国)", "瑞信证券"], domains: ["csfounder.com"], foreign: true },
  { id: "sxzq", name: "山西证券", otherNames: ["山证（上海）资产管理", "山证资管"], domains: ["i618.com.cn"] },
  // 上海证券交易所和《上海证券报》的名字里也有“上海证券”，身份词典里要排除。
  { id: "shzq", name: "上海证券", domains: ["shzq.com"], lexicon: /上海证券(?!报|交易所)/ },
  { id: "century", name: "世纪证券", domains: ["csco.com.cn"] },
  { id: "shouchuang", name: "首创证券", domains: ["sczq.com.cn"] },
  { id: "chengtong", name: "诚通证券", domains: ["cctgsc.com.cn"] },
  { id: "wanhe", name: "万和证券", domains: ["vanho.cn"] },
  { id: "wanlian", name: "万联证券", otherNames: ["万联证券资产管理（广东）", "万联证券资管"], domains: ["wlzq.com.cn"] },
  { id: "wkzq", name: "五矿证券", domains: ["wkzq.com.cn"] },
  { id: "xnzq", name: "西南证券", domains: ["swsc.com.cn"] },
  { id: "xiangcai", name: "湘财证券", domains: ["xcsc.com"] },
  { id: "dbs-china", name: "星展证券（中国）", aliases: ["星展证券"], domains: ["dbssecurities.com.cn"], foreign: true },
  { id: "nomura-oi", name: "野村东方国际证券", aliases: ["野村东方"], domains: ["nomuraoi-sec.com"], foreign: true },
  { id: "yintai", name: "银泰证券", domains: ["ytzq.com"] },
  { id: "yingda", name: "英大证券", domains: ["ydsc.com.cn"] },
  { id: "yuekai", name: "粤开证券", domains: ["lxzq.com.cn"] },
  { id: "zhongde", name: "中德证券", domains: ["zdzq.com.cn"] },
  { id: "avic-sec", name: "中航证券", domains: ["avicsec.com"] },
  { id: "zhongshan", name: "中山证券", domains: ["zszq.com"] },
  { id: "ztgf", name: "中天国富证券", domains: ["ztfsec.com"] },
  { id: "zhongtian", name: "中天证券", domains: ["iztzq.com"] },
  { id: "boci-sec", name: "中银证券", aliases: ["中银国际证券"], domains: ["bocichina.com"] },
  { id: "zypost", name: "中邮证券", domains: ["cnpsec.com"] },
  { id: "zyzq", name: "中原证券", domains: ["ccnew.com"] },
  { id: "yongxing", name: "甬兴证券", otherNames: ["上海甬兴证券资产管理", "甬兴资管"], domains: ["yongxingsec.com"] },
  { id: "scb-china", name: "渣打证券（中国）", aliases: ["渣打证券"], domains: ["scs.com.cn"], foreign: true },
];
