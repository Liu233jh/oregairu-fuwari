import sitemap from "@astrojs/sitemap";
import svelte from "@astrojs/svelte";
import tailwind from "@astrojs/tailwind";
// Keystatic 写作界面所需
import node from "@astrojs/node";
import react from "@astrojs/react";
import markdoc from "@astrojs/markdoc";
import keystatic from "@keystatic/astro";
import { pluginCollapsibleSections } from "@expressive-code/plugin-collapsible-sections";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import swup from "@swup/astro";
import expressiveCode from "astro-expressive-code";
import icon from "astro-icon";
import { defineConfig } from "astro/config";
import { fileURLToPath } from "node:url";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeComponents from "rehype-components"; /* Render the custom directive content */
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import remarkDirective from "remark-directive"; /* Handle directives */
import remarkGithubAdmonitionsToDirectives from "remark-github-admonitions-to-directives";
import remarkMath from "remark-math";
import remarkSectionize from "remark-sectionize";
import { expressiveCodeConfig } from "./src/config.ts";
import { pluginLanguageBadge } from "./src/plugins/expressive-code/language-badge.ts";
import { AdmonitionComponent } from "./src/plugins/rehype-component-admonition.mjs";
import { GithubCardComponent } from "./src/plugins/rehype-component-github-card.mjs";
import { parseDirectiveNode } from "./src/plugins/remark-directive-rehype.js";
import { remarkExcerpt } from "./src/plugins/remark-excerpt.js";
import { remarkReadingTime } from "./src/plugins/remark-reading-time.mjs";
import { pluginCustomCopyButton } from "./src/plugins/expressive-code/custom-copy-button.js";
import { rehypeBaseLinks } from "./src/plugins/rehype-base-links.mjs";

// 部署版的 base —— site 与 base 必须成对出现，改仓库名时两处一起改。
const BASE = "/oregairu-fuwari/";

// https://astro.build/config
export default defineConfig({
	// ── 部署版：GitHub Pages 项目页 ──
	// site 必须和 base 一起改，否则 RSS / sitemap / robots 里的绝对 URL 是错的。
	// 仓库改名的话这两行要同步改（BASE 常量定义在文件顶部，rehype 插件也在用）。
	site: "https://liu233jh.github.io/oregairu-fuwari/",
	base: BASE,
	// fuwari 原本是 "always"，但那会让 Keystatic 的 API 路由
	// /api/keystatic/[...params] 只匹配带结尾斜杠的形式，
	// 而 Keystatic 客户端请求的是 /api/keystatic/tree（无斜杠）→ 404、后台读不到内容；
	// 强行让它匹配到 "tree/" 时 Keystatic 又会返回 400 Bad Request。
	// "ignore" 让带斜杠和不带斜杠的 URL 都有效：博客链接仍然全是 /posts/xxx/ 形式，
	// 而 Keystatic 的 API 可以正常命中。
	trailingSlash: "ignore",
	// Keystatic 往项目里注入了两个 prerender: false 的路由
	// （/keystatic/[...params] 和 /api/keystatic/[...params]），
	// 没有 adapter 时 `astro build` 会直接报 NoAdapterInstalled 而失败。
	// 装了 node adapter 之后：
	//   · 博客 / 语录 / 雪乃等页面仍然是默认 prerender: true → 照旧输出静态 HTML
	//   · 只有 Keystatic 那两个路由走按需渲染，由 Node 服务器处理
	// 副作用：有 adapter 后构建产物会变成 dist/client（静态）+ dist/server（服务端），
	// 所以 package.json 里的 pagefind 要指向 dist/client。
	output: "static",
	adapter: node({ mode: "standalone" }),
	integrations: [
		tailwind({
			nesting: true,
		}),
		swup({
			theme: false,
			animationClass: "transition-swup-", // see https://swup.js.org/options/#animationselector
			// the default value `transition-` cause transition delay
			// when the Tailwind class `transition-all` is used
			containers: ["main", "#toc"],
			smoothScrolling: true,
			cache: true,
			preload: true,
			accessibility: true,
			updateHead: true,
			updateBodyClass: false,
			globalInstance: true,
		}),
		icon({
			include: {
				"preprocess: vitePreprocess(),": ["*"],
				"fa6-brands": ["*"],
				"fa6-regular": ["*"],
				"fa6-solid": ["*"],
			},
		}),
		expressiveCode({
			themes: [expressiveCodeConfig.theme, expressiveCodeConfig.theme],
			plugins: [
				pluginCollapsibleSections(),
				pluginLineNumbers(),
				pluginLanguageBadge(),
				pluginCustomCopyButton()
			],
			defaultProps: {
				wrap: true,
				overridesByLang: {
					'shellsession': {
						showLineNumbers: false,
					},
				},
			},
			styleOverrides: {
				codeBackground: "var(--codeblock-bg)",
				borderRadius: "0.75rem",
				borderColor: "none",
				codeFontSize: "0.875rem",
				codeFontFamily: "'JetBrains Mono Variable', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
				codeLineHeight: "1.5rem",
				frames: {
					editorBackground: "var(--codeblock-bg)",
					terminalBackground: "var(--codeblock-bg)",
					terminalTitlebarBackground: "var(--codeblock-topbar-bg)",
					editorTabBarBackground: "var(--codeblock-topbar-bg)",
					editorActiveTabBackground: "none",
					editorActiveTabIndicatorBottomColor: "var(--primary)",
					editorActiveTabIndicatorTopColor: "none",
					editorTabBarBorderBottomColor: "var(--codeblock-topbar-bg)",
					terminalTitlebarBorderBottomColor: "none"
				},
				textMarkers: {
					delHue: 0,
					insHue: 180,
					markHue: 250
				}
			},
			frames: {
				showCopyToClipboardButton: false,
			}
		}),
        svelte(),
		sitemap(),
		// Keystatic 本地写作界面：http://localhost:4321/keystatic
		react(),
		markdoc(),
		keystatic(),
	],
	markdown: {
		remarkPlugins: [
			remarkMath,
			remarkReadingTime,
			remarkExcerpt,
			remarkGithubAdmonitionsToDirectives,
			remarkDirective,
			remarkSectionize,
			parseDirectiveNode,
		],
		rehypePlugins: [
			rehypeKatex,
			rehypeSlug,
			// 给 Markdown 正文里写死的根路径链接（[核心概念](/posts/core-concepts/)）
			// 补上 base 前缀。Astro 只重写它自己生成的 URL，不管 Markdown 里的，
			// 所以部署到项目页后这些链接会 404。见 src/plugins/rehype-base-links.mjs
			[rehypeBaseLinks, { base: BASE }],
			[
				rehypeComponents,
				{
					components: {
						github: GithubCardComponent,
						note: (x, y) => AdmonitionComponent(x, y, "note"),
						tip: (x, y) => AdmonitionComponent(x, y, "tip"),
						important: (x, y) => AdmonitionComponent(x, y, "important"),
						caution: (x, y) => AdmonitionComponent(x, y, "caution"),
						warning: (x, y) => AdmonitionComponent(x, y, "warning"),
					},
				},
			],
			[
				rehypeAutolinkHeadings,
				{
					behavior: "append",
					properties: {
						className: ["anchor"],
					},
					content: {
						type: "element",
						tagName: "span",
						properties: {
							className: ["anchor-icon"],
							"data-pagefind-ignore": true,
						},
						children: [
							{
								type: "text",
								value: "#",
							},
						],
					},
				},
			],
		],
	},
	vite: {
		resolve: {
			// Keystatic 的服务端模块在顶层 import 了 Astro 虚拟模块 `astro:env/server`
			// （见 @keystatic/astro/dist/keystatic-astro-api.js）。
			// 开发态由 Astro 的 astro-env-plugin（enforce: "pre"）解析它，所以这里不影响
			// 正常运行；但 Vite 的 esbuild 依赖预打包**不执行 Vite 插件**，esbuild 会退化成
			// 按普通包名去 node_modules 里找 `astro:env` 目录，在 Windows 上因冒号是非法
			// 路径字符而整包预打包失败（Cannot read directory "node_modules/astro:env"），
			// 表现为 Keystatic 后台一直空白。
			// 给优化器一个替身即可：本项目用 storage: local、也没有 env schema，
			// 所以 getSecret 返回 undefined 完全等价。
			alias: [
				{
					find: "astro:env/server",
					replacement: fileURLToPath(
						new URL("./src/keystatic-env-stub.ts", import.meta.url),
					),
				},
			],
		},
		build: {
			rollupOptions: {
				onwarn(warning, warn) {
					// temporarily suppress this warning
					if (
						warning.message.includes("is dynamically imported by") &&
						warning.message.includes("but also statically imported by")
					) {
						return;
					}
					warn(warning);
				},
			},
		},
	},
});
