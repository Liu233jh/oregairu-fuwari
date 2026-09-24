/**
 * rehype 插件：给 Markdown 里的「根路径链接」加上 Astro 的 base 前缀。
 *
 * 为什么需要：
 *   Markdown 正文里的链接是写死的绝对路径，例如
 *     [核心概念](/posts/core-concepts/)
 *   Astro **不会**重写 Markdown 里的链接（它只重写自己生成的 URL），
 *   所以部署到 GitHub Pages 项目页（base = /仓库名/）之后，
 *   这些链接会指向站点根而不是子路径 → 404。
 *
 * 只处理以单个 `/` 开头的链接：
 *   - `//example.com`（协议相对）不动
 *   - `https://…` / `mailto:` / `#anchor` 不动
 *   - 已经带了 base 前缀的也不动（防止重复加）
 */
import { visit } from "unist-util-visit";

export function rehypeBaseLinks(options = {}) {
	const raw = options.base || "/";
	// 归一化成「不带尾斜杠」的形式，便于拼接与判断
	const base = raw.endsWith("/") ? raw.slice(0, -1) : raw;

	return (tree) => {
		if (!base) return; // base 为 "/" 时无需处理
		visit(tree, "element", (node) => {
			if (node.tagName !== "a") return;
			const href = node.properties?.href;
			if (typeof href !== "string") return;
			if (!href.startsWith("/") || href.startsWith("//")) return;
			if (href === base || href.startsWith(`${base}/`)) return;
			node.properties.href = base + href;
		});
	};
}

export default rehypeBaseLinks;
