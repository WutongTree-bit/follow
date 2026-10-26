# 站点

这个站自己的东西：名字、文案、品牌、页面，以及启用哪些模块。步骤见 [把它改成你的行业](../docs/customize.md)。

| 文件 | 内容 |
|---|---|
| `site.ts` | 站名、行业词、出刊时间、首页和关于页文案、分享图文字、条目与日报周报月报上的说法、公开接口的分类、备案号 |
| `models.ts` | 具名的模型和每一步默认用哪个（没写的步骤用 `.env` 里配的那一个） |
| `brand/` | 图标、Logo（`Logo.tsx`）、分享图和海报上的字标（`wordmark.svg`、`wordmark-dark.svg`，可选）、日报周报月报的报头字（`nameplates/`）、关于页的二维码（`contact/`，可选） |
| `pages/` | 使用规则、隐私说明（模板，上线前按实际情况改写） |
| `public/` | 发布在网站根目录的固定文件（站名、地址等占位符替换后发布）：`robots.txt`、`manifest.webmanifest`、`openapi-v1.json`，以及可选的 `.well-known/security.txt` |
| `changelog.json` | 更新日志 |
| `modules/` | 启用哪些模块：`index.ts`、`server.ts`、`web.ts` 三份清单，列出仓库根目录 `modules/<名字>/` 里要用的模块，默认都为空，见 [架构](../docs/architecture.md#模块) 的“模块” |

## 券业社品牌

图标使用断开的观察镜头、三根数据柱和一个焦点，青色表示观察，珊瑚红表示重点。网页字标与静态图标共用 [`brand/mark.ts`](brand/mark.ts) 的图形；站名读取 [`site.ts`](site.ts)，栏目名和 MCP 前缀不随品牌改名。

改名或调整图形后，用 Noto Sans SC 字体包重新生成图标、favicon 和深浅色字标（字形转成路径，不依赖访问者字体）：

```bash
node scripts/brand.ts <@fontsource/noto-sans-sc 字体包目录>
docker compose up -d --build
```

命令在仓库根目录运行。字体包获取方法见[品牌定制](../docs/customize.md#6-品牌sitebrand)。日报、周报、月报报头仍使用“券商”行业词，无需随站名重新生成。
