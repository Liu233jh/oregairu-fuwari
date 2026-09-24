import { url } from "../utils/url-utils";
/**
 * 语录页逻辑
 *
 * ⚠️ 同 live2d-page.ts：Swup 软导航不会重跑页面脚本，
 * 所以这段逻辑必须做成可重复调用的模块，由 Layout 的调度器在
 * swup:page:view 时调用。
 *
 * 数据从页面上 <script id="quotes-data" type="application/json"> 读取，
 * 避免模块里硬编码 319 条语录。
 */

type QuoteItem = {
	i: number;
	text: string;
	char: string;
	charName: string;
	themes: string[];
	featured: boolean;
	note: string;
	volume: number;
};

type State = { scope: string; char: string; theme: string; q: string; page: number };

const PAGE_SIZE = 24;

let bound = false;
let state: State = { scope: "all", char: "all", theme: "all", q: "", page: 1 };
let allItems: QuoteItem[] = [];
let charNames: Record<string, string> = {};

let grid: HTMLElement | null = null;
let emptyBox: HTMLElement | null = null;
let pager: HTMLElement | null = null;
let statusEl: HTMLElement | null = null;
let resetBtn: HTMLElement | null = null;
let searchInput: HTMLInputElement | null = null;
let clearBtn: HTMLElement | null = null;

function escapeHtml(s: string) {
	return s.replace(/[&<>"']/g, (c) =>
		({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
	);
}

function highlight(text: string, kw: string) {
	const safe = escapeHtml(text);
	if (!kw) return safe;
	const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return safe.replace(new RegExp(escaped, "gi"), (m) => `<mark class="q-mark">${m}</mark>`);
}

function readURL() {
	const p = new URLSearchParams(location.search);
	state.scope = p.get("scope") === "featured" ? "featured" : "all";
	state.char = p.get("char") || "all";
	state.theme = p.get("theme") || "all";
	state.q = p.get("q") || "";
	state.page = Math.max(1, parseInt(p.get("page") || "1", 10) || 1);
	if (searchInput) searchInput.value = state.q;
}

function writeURL() {
	const p = new URLSearchParams();
	if (state.scope === "featured") p.set("scope", "featured");
	if (state.char !== "all") p.set("char", state.char);
	if (state.theme !== "all") p.set("theme", state.theme);
	if (state.q) p.set("q", state.q);
	if (state.page > 1) p.set("page", String(state.page));
	const qs = p.toString();
	history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
}

function filtered(): QuoteItem[] {
	const kw = state.q.trim().toLowerCase();
	return allItems.filter((it) => {
		if (state.scope === "featured" && !it.featured) return false;
		if (state.char !== "all" && it.char !== state.char) return false;
		if (state.theme !== "all" && !(it.themes || []).includes(state.theme)) return false;
		if (kw) {
			const hay = (it.text + " " + it.charName + " " + (it.themes || []).join(" ")).toLowerCase();
			if (!hay.includes(kw)) return false;
		}
		return true;
	});
}

function renderPager(totalPages: number) {
	if (!pager) return;
	if (totalPages <= 1) {
		pager.innerHTML = "";
		return;
	}
	const cur = state.page;
	const btns: string[] = [];
	btns.push(`<button class="chip" data-page="${cur - 1}" ${cur === 1 ? "disabled" : ""}>← 上一页</button>`);

	const pages = new Set([1, totalPages, cur, cur - 1, cur + 1, cur - 2, cur + 2]);
	const arr = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
	let prev = 0;
	for (const p of arr) {
		if (prev && p - prev > 1) btns.push(`<span class="px-1 text-50">…</span>`);
		btns.push(`<button class="chip${p === cur ? " active" : ""}" data-page="${p}">${p}</button>`);
		prev = p;
	}
	btns.push(`<button class="chip" data-page="${cur + 1}" ${cur === totalPages ? "disabled" : ""}>下一页 →</button>`);
	pager.innerHTML = btns.join("");
}

function render() {
	if (!grid) return;
	const list = filtered();
	const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
	if (state.page > totalPages) state.page = totalPages;

	const start = (state.page - 1) * PAGE_SIZE;
	const pageItems = list.slice(start, start + PAGE_SIZE);
	const kw = state.q.trim();

	grid.innerHTML = pageItems
		.map(
			(it) => `
		<blockquote class="quote-card${it.featured ? " is-featured" : ""}" data-char="${it.char}">
			${it.featured ? '<span class="q-badge">精选</span>' : ""}
			<p>「${highlight(it.text, kw)}」</p>
			<footer>
				<button class="q-char q-char-btn" data-jump-char="${it.char}" title="筛选该角色的语录">
					—— ${escapeHtml(it.charName)}
				</button>
				${
					it.featured && it.note
						? `<span class="q-meta" title="${escapeHtml(it.note)}">第${it.volume || "?"}卷</span>`
						: it.themes && it.themes.length
							? `<span class="q-meta">${it.themes.slice(0, 2).join(" · ")}</span>`
							: ""
				}
			</footer>
		</blockquote>`,
		)
		.join("");

	emptyBox?.classList.toggle("hidden", list.length > 0);
	grid.classList.toggle("hidden", list.length === 0);

	const parts: string[] = [];
	if (state.scope === "featured") parts.push("仅精选");
	if (state.char !== "all") parts.push(`角色「${charNames[state.char] || state.char}」`);
	if (state.theme !== "all") parts.push(`主题「${state.theme}」`);
	if (kw) parts.push(`关键词「${kw}」`);
	const cond = parts.length ? ` · 已筛选：${parts.join(" + ")}` : "";
	if (statusEl) {
		statusEl.textContent = list.length
			? `共 ${list.length} 条${cond}${totalPages > 1 ? ` · 第 ${state.page}/${totalPages} 页` : ""}`
			: "没有匹配结果";
	}
	resetBtn?.classList.toggle("hidden", parts.length === 0);
	clearBtn?.classList.toggle("hidden", !kw);

	renderPager(totalPages);

	document.querySelectorAll("#scope-filter .chip").forEach((b) => {
		b.classList.toggle("active", ((b as HTMLElement).dataset.scope || "all") === state.scope);
	});
	document.querySelectorAll("#char-filter .chip").forEach((b) => {
		b.classList.toggle("active", ((b as HTMLElement).dataset.char || "all") === state.char);
	});
	document.querySelectorAll("#theme-filter .chip").forEach((b) => {
		b.classList.toggle("active", ((b as HTMLElement).dataset.theme || "all") === state.theme);
	});
}

function resetAll() {
	state = { scope: "all", char: "all", theme: "all", q: "", page: 1 };
	if (searchInput) searchInput.value = "";
	writeURL();
	render();
}

/** 初始化（幂等；可被 Swup 软导航反复调用） */
export async function initQuotes() {
	grid = document.getElementById("quote-grid");
	if (!grid) return;                          // 不在语录页
	if (grid.dataset.qInit === "1") return;     // 这个 grid 已初始化过

	emptyBox = document.getElementById("q-empty");
	pager = document.getElementById("q-pager");
	statusEl = document.getElementById("q-count");
	resetBtn = document.getElementById("q-reset");
	searchInput = document.getElementById("q-search") as HTMLInputElement | null;
	clearBtn = document.getElementById("q-clear");

	// ── 取数据 ──
	// ⚠️ 不塞在页面 DOM 里：Astro 会把 <script> 移出 <main>，
	//    而 Swup 只替换 <main>，软导航后数据就不在 DOM 中了。
	//    改成 fetch 静态 JSON，模块内缓存，二次导航无请求。
	if (!allItems.length) {
		if (statusEl) statusEl.textContent = "正在加载语录…";
		try {
			const res = await fetch(url("/quotes-data.json"));
			if (!res.ok) throw new Error("HTTP " + res.status);
			const data = await res.json();
			allItems = data.items || [];
			charNames = data.charNames || {};
		} catch (err) {
			console.error("[quotes] 数据加载失败", err);
			if (statusEl) statusEl.textContent = "语录数据加载失败：" + String((err as Error).message || err);
			return;   // ★ 不设 qInit 标记，下次导航会重试
		}
	}
	if (!allItems.length) {
		if (statusEl) statusEl.textContent = "语录数据为空";
		return;
	}

	// 数据就绪后才打标记
	grid.dataset.qInit = "1";

	// 事件（全局只绑一次；都在 document 上，不受 <main> 替换影响）
	if (!bound) {
		bound = true;

		document.addEventListener("click", (e) => {
			const t = e.target as HTMLElement;
			const btn = t.closest(".chip") as HTMLElement | null;
			if (!btn) return;
			const parent = btn.parentElement;
			if (!parent) return;

			if (parent.id === "scope-filter") {
				state.scope = btn.dataset.scope || "all";
			} else if (parent.id === "char-filter") {
				state.char = btn.dataset.char || "all";
			} else if (parent.id === "theme-filter") {
				state.theme = btn.dataset.theme || "all";
			} else {
				return;
			}
			state.page = 1;
			writeURL();
			render();
		});

		// 点卡片上的角色名 → 筛选该角色
		document.addEventListener("click", (e) => {
			const btn = (e.target as HTMLElement).closest("[data-jump-char]") as HTMLElement | null;
			if (!btn || !document.getElementById("quote-grid")) return;
			state.char = btn.dataset.jumpChar || "all";
			state.page = 1;
			writeURL();
			render();
			window.scrollTo({ top: 0, behavior: "smooth" });
		});

		// 分页
		document.addEventListener("click", (e) => {
			const btn = (e.target as HTMLElement).closest("#q-pager [data-page]") as HTMLButtonElement | null;
			if (!btn || btn.disabled) return;
			const p = parseInt(btn.dataset.page || "", 10);
			if (!p || p === state.page) return;
			state.page = p;
			writeURL();
			render();
			const el = document.getElementById("quote-grid");
			if (el) {
				const top = el.getBoundingClientRect().top + window.scrollY - 100;
				window.scrollTo({ top, behavior: "smooth" });
			}
		});

		// 搜索（防抖）
		let timer: number | undefined;
		document.addEventListener("input", (e) => {
			const el = e.target as HTMLInputElement;
			if (el.id !== "q-search") return;
			window.clearTimeout(timer);
			timer = window.setTimeout(() => {
				state.q = el.value.trim();
				state.page = 1;
				writeURL();
				render();
			}, 180);
		});

		// 清除搜索
		document.addEventListener("click", (e) => {
			if (!(e.target as HTMLElement).closest("#q-clear")) return;
			if (searchInput) searchInput.value = "";
			state.q = "";
			state.page = 1;
			writeURL();
			render();
			searchInput?.focus();
		});

		// 重置全部
		document.addEventListener("click", (e) => {
			if ((e.target as HTMLElement).closest("#q-reset,#q-empty-reset")) resetAll();
		});

		// 前进/后退
		window.addEventListener("popstate", () => {
			if (!document.getElementById("quote-grid")) return;
			readURL();
			render();
		});
	}

	readURL();
	render();
}
