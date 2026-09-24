<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import Icon from "@iconify/svelte";
import { url } from "@utils/url-utils.ts";
import { onMount } from "svelte";
import type { SearchResult } from "@/global";

let keywordDesktop = "";
let keywordMobile = "";
let result: SearchResult[] = [];
let isSearching = false;
let pagefindLoaded = false;
let initialized = false;
let hasSearched = false;

/* ══════════════════════════════════════════════
   语录检索（本站的主内容，Pagefind 搜不到）

   ── 为什么需要单独一路：
      Pagefind 只索引标了 data-pagefind-body 的页面，而语录页是客户端
      从 JSON 渲染的，构建产物里是空壳 —— 实测搜「伊吕波学姐」0 命中。
      结果就是「一个叫春物语录的站，搜索搜不到任何一条语录」。

   ── 为什么不做成 450 个静态页：
      那样能得到 Pagefind 的逐条结果，但要新增 450 个页面；
      而 /quotes-data.json 本来就已经存在（语录页在用），
      450 条约 30KB，第一次搜索时懒加载一次缓存住即可。

   ── 结果怎么点进去：
      链接到 /quotes/?q=<整句原文>。语录页的匹配是
      `(text + charName + themes).toLowerCase().includes(kw)`，
      拿整句当关键词能精确落到那一条。
   ══════════════════════════════════════════════ */
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

const QUOTE_LIMIT = 8;
let quotesIndex: QuoteItem[] | null = null;
let quotesLoading: Promise<void> | null = null;

function ensureQuotes(): Promise<void> {
	if (quotesIndex) return Promise.resolve();
	if (!quotesLoading) {
		quotesLoading = fetch(url("/quotes-data.json"))
			.then((r) => (r.ok ? r.json() : null))
			.then((d) => {
				// ⚠️ 端点返回的是对象 { items, charNames, charCount, ... }，不是数组
				quotesIndex = Array.isArray(d) ? d : Array.isArray(d?.items) ? d.items : [];
			})
			.catch((e) => {
				console.warn("quotes index unavailable:", e);
				quotesIndex = [];
			});
	}
	return quotesLoading;
}

/** excerpt 是走 {@html} 渲染的，必须转义 */
function esc(s: string): string {
	return s.replace(
		/[&<>"']/g,
		(c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
	);
}

async function searchQuotes(keyword: string): Promise<SearchResult[]> {
	await ensureQuotes();
	const kw = keyword.trim().toLowerCase();
	if (!kw || !quotesIndex) return [];
	const hits = quotesIndex.filter((q) =>
		`${q.text} ${q.charName} ${(q.themes || []).join(" ")}`.toLowerCase().includes(kw),
	);
	// 精选（金句）优先，其余保持原顺序
	hits.sort((a, b) => Number(b.featured) - Number(a.featured));
	return hits.slice(0, QUOTE_LIMIT).map((q) => ({
		url: url(`/quotes/?q=${encodeURIComponent(q.text)}`),
		meta: { title: `「${q.text}」` },
		excerpt: `—— ${esc(q.charName)}${q.themes && q.themes.length ? ` · ${esc(q.themes.join(" / "))}` : ""}`,
	}));
}

const fakeResult: SearchResult[] = [
	{
		url: url("/"),
		meta: {
			title: "This Is a Fake Search Result",
		},
		excerpt:
			"Because the search cannot work in the <mark>dev</mark> environment.",
	},
	{
		url: url("/"),
		meta: {
			title: "If You Want to Test the Search",
		},
		excerpt: "Try running <mark>npm build && npm preview</mark> instead.",
	},
];

const togglePanel = () => {
	const panel = document.getElementById("search-panel");
	panel?.classList.toggle("float-panel-closed");
};

const setPanelVisibility = (show: boolean, isDesktop: boolean): void => {
	const panel = document.getElementById("search-panel");
	if (!panel || !isDesktop) return;

	if (show) {
		panel.classList.remove("float-panel-closed");
	} else {
		panel.classList.add("float-panel-closed");
	}
};

const search = async (keyword: string, isDesktop: boolean): Promise<void> => {
	if (!keyword) {
		setPanelVisibility(false, isDesktop);
		result = [];
		hasSearched = false;
		return;
	}

	if (!initialized) {
		return;
	}

	isSearching = true;

	try {
		// ① 语录：客户端检索（dev 下也能用，不像 Pagefind）
		const quoteHits = await searchQuotes(keyword);

		// ② 文章：Pagefind
		let articleHits: SearchResult[] = [];
		if (import.meta.env.PROD && pagefindLoaded && window.pagefind) {
			const response = await window.pagefind.search(keyword);
			articleHits = await Promise.all(
				response.results.map((item) => item.data()),
			);
		} else if (import.meta.env.DEV) {
			articleHits = fakeResult;
		}

		result = [...quoteHits, ...articleHits];
		hasSearched = true;
		// ⚠️ 这里不能再用 result.length > 0 决定显不显示：
		//    那样「没搜到」时面板直接关闭，用户会以为是自己没按对 ——
		//    现在面板常开，由下面渲染「没有找到」。
		setPanelVisibility(true, isDesktop);
	} catch (error) {
		console.error("Search error:", error);
		result = [];
		hasSearched = true;
		setPanelVisibility(true, isDesktop);
	} finally {
		isSearching = false;
	}
};

onMount(() => {
	const initializeSearch = () => {
		initialized = true;
		pagefindLoaded =
			typeof window !== "undefined" &&
			!!window.pagefind &&
			typeof window.pagefind.search === "function";
		console.log("Pagefind status on init:", pagefindLoaded);
		if (keywordDesktop) search(keywordDesktop, true);
		if (keywordMobile) search(keywordMobile, false);
	};

	if (import.meta.env.DEV) {
		console.log(
			"Pagefind is not available in development mode. Using mock data.",
		);
		initializeSearch();
	} else {
		document.addEventListener("pagefindready", () => {
			console.log("Pagefind ready event received.");
			initializeSearch();
		});
		document.addEventListener("pagefindloaderror", () => {
			console.warn(
				"Pagefind load error event received. Search functionality will be limited.",
			);
			initializeSearch(); // Initialize with pagefindLoaded as false
		});

		// Fallback in case events are not caught or pagefind is already loaded by the time this script runs
		setTimeout(() => {
			if (!initialized) {
				console.log("Fallback: Initializing search after timeout.");
				initializeSearch();
			}
		}, 2000); // Adjust timeout as needed
	}
});

$: if (initialized && keywordDesktop) {
	(async () => {
		await search(keywordDesktop, true);
	})();
}

$: if (initialized && keywordMobile) {
	(async () => {
		await search(keywordMobile, false);
	})();
}
</script>

<!-- search bar for desktop view -->
<div id="search-bar" class="hidden lg:flex transition-all items-center h-11 mr-2 rounded-lg
      bg-black/[0.04] hover:bg-black/[0.06] focus-within:bg-black/[0.06]
      dark:bg-white/5 dark:hover:bg-white/10 dark:focus-within:bg-white/10
">
    <Icon icon="material-symbols:search" class="absolute text-[1.25rem] pointer-events-none ml-3 transition my-auto text-black/30 dark:text-white/30"></Icon>
    <input placeholder="{i18n(I18nKey.search)}" bind:value={keywordDesktop} on:focus={() => search(keywordDesktop, true)}
           class="transition-all pl-10 text-sm bg-transparent outline-0
         h-full w-40 active:w-60 focus:w-60 text-black/50 dark:text-white/50"
    >
</div>

<!-- toggle btn for phone/tablet view -->
<button on:click={togglePanel} aria-label="Search Panel" id="search-switch"
        class="btn-plain scale-animation lg:!hidden rounded-lg w-11 h-11 active:scale-90">
    <Icon icon="material-symbols:search" class="text-[1.25rem]"></Icon>
</button>

<!-- search panel -->
<div id="search-panel" class="float-panel float-panel-closed search-panel absolute md:w-[30rem]
top-20 left-4 md:left-[unset] right-4 shadow-2xl rounded-2xl p-2">

    <!-- search bar inside panel for phone/tablet -->
    <div id="search-bar-inside" class="flex relative lg:hidden transition-all items-center h-11 rounded-xl
      bg-black/[0.04] hover:bg-black/[0.06] focus-within:bg-black/[0.06]
      dark:bg-white/5 dark:hover:bg-white/10 dark:focus-within:bg-white/10
  ">
        <Icon icon="material-symbols:search" class="absolute text-[1.25rem] pointer-events-none ml-3 transition my-auto text-black/30 dark:text-white/30"></Icon>
        <input placeholder="Search" bind:value={keywordMobile}
               class="pl-10 absolute inset-0 text-sm bg-transparent outline-0
               focus:w-60 text-black/50 dark:text-white/50"
        >
    </div>

    <!-- search results -->
    {#each result as item}
        <a href={item.url}
           class="transition first-of-type:mt-2 lg:first-of-type:mt-0 group block
       rounded-xl text-lg px-3 py-2 hover:bg-[var(--btn-plain-bg-hover)] active:bg-[var(--btn-plain-bg-active)]">
            <div class="transition text-90 inline-flex font-bold group-hover:text-[var(--primary)]">
                {item.meta.title}<Icon icon="fa6-solid:chevron-right" class="transition text-[0.75rem] translate-x-1 my-auto text-[var(--primary)]"></Icon>
            </div>
            <div class="transition text-sm text-50">
                {@html item.excerpt}
            </div>
        </a>
    {/each}

    <!-- 没搜到时的提示。
         ⚠️ 这里是写死的中文：站点 siteConfig.lang 就是 zh_CN，
            而「无结果」在 fuwari 的 i18n 里没有对应键。要国际化就补一个键。 -->
    {#if hasSearched && !isSearching && result.length === 0}
        <div class="px-3 py-6 text-center text-sm text-50">没有找到相关内容</div>
    {/if}
</div>

<style>
  input:focus {
    outline: 0;
  }
  .search-panel {
    max-height: calc(100vh - 100px);
    overflow-y: auto;
  }
</style>
