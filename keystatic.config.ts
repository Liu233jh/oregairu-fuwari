import { config, fields, collection, singleton } from "@keystatic/core";

/**
 * Keystatic CMS 配置
 *
 * 存储模式：local —— 纯本地，不需要 GitHub、不需要云服务
 * 写作界面：http://localhost:4321/keystatic
 *
 * ── 两个必须注意的坑（已在本文件里处理） ──
 *
 * 1) 内容扩展名必须是 md
 *    `fields.markdoc()` 默认用 `.mdoc`、`fields.mdx()` 默认用 `.mdx`，
 *    而本站文章是 `.md`。扩展名对不上时 Keystatic 会认为集合里一条内容都没有
 *    （后台显示 “0 entries / No results”）。所以：
 *      · 正文用 fields.markdoc({ extension: "md" })
 *      · 语录没有正文，用 fields.emptyContent({ extension: "md" }) 占位
 *    两个 extension 选项都是官方类型里声明过的（'mdoc' | 'md'）。
 *
 * 2) 中文标题的 slug
 *    Keystatic 内置的 slugify 是 `replace(/[^a-z0-9\s-]/g, ' ')`，
 *    中文标题会被清空成空字符串，进而触发 “slug 至少 1 个字符” 的校验错误。
 *    所以这里给 slug 字段自带一个 generate：能转 ASCII 就转，
 *    转不出来（纯中文标题）就退化成 post-年月日-时分秒。
 */

/** 中文标题友好的 slug 生成器 */
function chineseFriendlySlug(prefix: string) {
	return (name: string) => {
		const ascii = name
			.toLowerCase()
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.replace(/[^a-z0-9\s-]/g, " ")
			.trim()
			.replace(/[\s-]+/g, "-");
		if (ascii) return ascii;
		const d = new Date();
		const p = (n: number) => String(n).padStart(2, "0");
		return `${prefix}-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(
			d.getHours(),
		)}${p(d.getMinutes())}${p(d.getSeconds())}`;
	};
}

export default config({
	storage: {
		kind: "local",
	},

	ui: {
		brand: { name: "春物语录" },
		navigation: {
			内容: ["posts", "quotes"],
			站点: ["about"],
		},
	},

	collections: {
		/* ══════════ 博客文章 ══════════ */
		posts: collection({
			label: "博客文章",
			path: "src/content/posts/*",
			slugField: "title",
			format: { contentField: "content" },
			entryLayout: "content",
			columns: ["title", "published"],
			schema: {
				title: fields.slug({
					name: { label: "标题", validation: { isRequired: true } },
					slug: {
						label: "文件名（URL）",
						description:
							"留空则自动生成；中文标题会自动变成 post-年月日-时分秒，也可以自己填英文。",
						generate: chineseFriendlySlug("post"),
					},
				}),
				published: fields.date({
					label: "发布日期",
					defaultValue: { kind: "today" },
					validation: { isRequired: true },
				}),
				description: fields.text({
					label: "摘要",
					multiline: true,
					description: "列表页显示的一句话简介",
				}),
				category: fields.text({
					label: "分类",
					description: "如：导读 / 角色 / 深度解析 / 剧情 / 评价",
				}),
				tags: fields.array(fields.text({ label: "标签" }), {
					label: "标签",
					itemLabel: (props) => props.value || "新标签",
				}),
				content: fields.mdx({
					label: "正文",
					// 关键：本站文章是 .md，mdx 编辑器默认是 .mdx，必须显式指定
					extension: "md",
					options: {
						image: {
							directory: "src/assets/images",
							publicPath: "../../assets/images/",
						},
					},
				}),
			},
		}),

		/* ══════════ 语录 ══════════ */
		quotes: collection({
			label: "语录",
			path: "src/content/quotes/*",
			slugField: "text",
			// 语录文件只有 frontmatter、没有正文。用一个“空内容字段”占位，
			// 只为了把扩展名声明成 .md，好让 Keystatic 能认出这些文件。
			format: { contentField: "body" },
			columns: ["characterName", "featured"],
			schema: {
				text: fields.slug({
					name: { label: "语录正文", validation: { isRequired: true } },
					slug: {
						label: "文件名",
						description: "建议留空自动生成；批量导入的语录用 q0001 这种编号。",
						generate: chineseFriendlySlug("quote"),
					},
				}),
				character: fields.select({
					label: "角色 ID",
					options: [
						{ label: "雪之下雪乃", value: "yukino" },
						{ label: "由比滨结衣", value: "yui" },
						{ label: "比企谷八幡", value: "hachiman" },
						{ label: "一色彩羽", value: "iroha" },
						{ label: "户冢彩加", value: "totsuka" },
						{ label: "川崎沙希", value: "kawasaki" },
						{ label: "海老名姬菜", value: "ebina" },
						{ label: "材木座义辉", value: "zaimokuza" },
						{ label: "平冢静", value: "hiratsuka" },
						{ label: "雪之下阳乃", value: "haruno" },
						{ label: "叶山隼人", value: "hayama" },
						{ label: "三浦优美子", value: "miura" },
						{ label: "比企谷小町", value: "komachi" },
						{ label: "未识别", value: "unknown" },
					],
					defaultValue: "unknown",
				}),
				characterName: fields.text({ label: "角色中文名" }),
				volume: fields.integer({ label: "卷次", defaultValue: 0 }),
				note: fields.text({ label: "出处依据 / 备注", multiline: true }),
				themes: fields.array(fields.text({ label: "主题" }), {
					label: "主题标签",
					itemLabel: (props) => props.value || "新主题",
				}),
				featured: fields.checkbox({ label: "精选", defaultValue: false }),
				score: fields.integer({ label: "格言度评分", defaultValue: 0 }),
				order: fields.integer({ label: "排序", defaultValue: 999 }),
				body: fields.emptyContent({ extension: "md" }),
			},
		}),
	},

	singletons: {
		/* ══════════ 关于页 ══════════ */
		about: singleton({
			label: "关于页",
			path: "src/content/spec/about",
			format: { contentField: "content" },
			schema: {
				// 同样是 .md 文件，必须显式指定扩展名；
				// 用 mdx 而不是 markdoc：markdoc 序列化器会把 GFM 表格改写成
				// `{% table %}`（Astro 渲染 .md 时不认这个语法，表格会变成乱码文本），
				// 而 mdx 序列化器输出的 Markdown 与手写的基本等价。
				content: fields.mdx({ label: "内容", extension: "md" }),
			},
		}),
	},
});
