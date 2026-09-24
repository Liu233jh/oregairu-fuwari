import { defineCollection, z } from "astro:content";

const postsCollection = defineCollection({
	schema: z.object({
		title: z.string(),
		published: z.date(),
		updated: z.date().optional(),
		draft: z.boolean().optional().default(false),
		description: z.string().optional().default(""),
		image: z.string().optional().default(""),
		tags: z.array(z.string()).optional().default([]),
		category: z.string().optional().nullable().default(""),
		lang: z.string().optional().default(""),

		/* For internal use */
		prevTitle: z.string().default(""),
		prevSlug: z.string().default(""),
		nextTitle: z.string().default(""),
		nextSlug: z.string().default(""),
	}),
});
const specCollection = defineCollection({
	schema: z.object({}),
});

/** 春物语录 */
const quotesCollection = defineCollection({
	schema: z.object({
		text: z.string(),                                  // 语录正文
		character: z.string().default("unknown"),          // yukino / hachiman / yui / iroha / other
		characterName: z.string().default(""),             // 中文名
		volume: z.number().optional(),                     // 卷次
		chapter: z.string().optional().default(""),        // 章节
		themes: z.array(z.string()).optional().default([]),// 主题标签
		note: z.string().optional().default(""),           // 出处依据 / 语境备注
		featured: z.boolean().optional().default(false),   // 是否精选（人工核实）
		score: z.number().optional().default(0),           // 格言度评分（自动提取的）
		order: z.number().optional().default(999),         // 排序
	}),
});

export const collections = {
	posts: postsCollection,
	spec: specCollection,
	quotes: quotesCollection,
};
