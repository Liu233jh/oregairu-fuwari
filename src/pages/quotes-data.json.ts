import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

/**
 * 语录数据端点：/quotes-data.json
 *
 * 为什么用端点而不是把数据塞进页面 DOM：
 *   Astro 会把 <script> 移出 <main>，而 Swup 软导航只替换 <main>，
 *   导致软导航到语录页时数据根本不在 DOM 里（页面空白，且初始化标记卡住）。
 *   改成 fetch 一个静态 JSON 就绕开了 DOM 位置问题，且浏览器会缓存。
 */

const CHAR_NAMES: Record<string, string> = {
	yukino: "雪之下雪乃",
	yui: "由比滨结衣",
	hachiman: "比企谷八幡",
	iroha: "一色彩羽",
	totsuka: "户冢彩加",
	kawasaki: "川崎沙希",
	ebina: "海老名姬菜",
	zaimokuza: "材木座义辉",
	hiratsuka: "平冢静",
	haruno: "雪之下阳乃",
	hayama: "叶山隼人",
	miura: "三浦优美子",
	komachi: "比企谷小町",
	unknown: "未识别",
};

export const GET: APIRoute = async () => {
	const quotes = await getCollection("quotes");

	const items = quotes
		.sort((a, b) => a.data.order - b.data.order)
		.map((q, i) => ({
			i: i + 1,
			text: q.data.text,
			char: q.data.character || "unknown",
			charName: q.data.characterName || CHAR_NAMES[q.data.character] || "（未识别）",
			themes: q.data.themes || [],
			featured: q.data.featured === true,
			note: q.data.note || "",
			volume: q.data.volume || 0,
		}));

	// 统计
	const charCount: Record<string, number> = {};
	for (const it of items) charCount[it.char] = (charCount[it.char] || 0) + 1;

	const themeCount: Record<string, number> = {};
	for (const it of items) for (const t of it.themes) themeCount[t] = (themeCount[t] || 0) + 1;

	return new Response(
		JSON.stringify({
			items,
			charNames: CHAR_NAMES,
			charCount,
			themeCount,
			total: items.length,
			featured: items.filter((it) => it.featured).length,
		}),
		{
			headers: {
				"Content-Type": "application/json; charset=utf-8",
				"Cache-Control": "public, max-age=300",
			},
		},
	);
};
