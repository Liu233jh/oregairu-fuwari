/**
 * 全局页面初始化调度器
 *
 * ⚠️ 为什么需要它：
 *   fuwari 用 Swup（@swup/astro）做软导航。Swup 只替换 <main id="swup-container">，
 *   而 Astro 会把 <script> 提升到 <main> 之外 —— 所以页面内的脚本在软导航后
 *   【不会重新执行】。结果是：从主页点「雪乃」进去，Live2D 卡在加载中；
 *   点「语录」进去，语录列表是空的。必须 Ctrl+F5 才行。
 *
 *   解法：把页面逻辑抽成幂等模块，在每次 swup:page:view 时重新调用。
 *   document 上的监听器不会随 <main> 被替换而消失，所以调度器一直在。
 */

import { initLive2D, destroyLive2D } from "./live2d-page";
import { initQuotes } from "./quotes-page";
import { initHeroTyping, destroyHeroTyping } from "./hero-typing";
import { initHeroScroll, destroyHeroScroll } from "./hero-scroll";
import { initPageBleed, destroyPageBleed } from "./page-bleed";

let scheduled = false;

async function dispatch() {
	// 先清理上一页遗留的实例（避免 Pixi 内存泄漏 / 定时器空转 / 监听器堆积）
	destroyLive2D();
	destroyHeroTyping();
	destroyHeroScroll();
	destroyPageBleed();

	// 再按当前 DOM 判断该初始化什么
	// （这些都是幂等的：不在对应页面时直接 return）
	try {
		await initQuotes();
	} catch (err) {
		console.error("[page-init] quotes", err);
	}

	initHeroTyping();
	initHeroScroll();
	initPageBleed();
	initLive2D().catch((err) => console.error("[page-init] live2d", err));
}

/**
 * 防抖：Swup 一次导航会触发多个事件
 *
 * ⚠️ 不要用 requestAnimationFrame —— 页面在后台标签页时 rAF 不触发，
 *    会导致软导航后初始化代码永远不跑（表现为「必须刷新才生效」）。
 *    用 setTimeout 才可靠。
 */
function schedule() {
	if (scheduled) return;
	scheduled = true;
	setTimeout(() => {
		scheduled = false;
		dispatch().catch((err) => console.error("[page-init]", err));
	}, 0);
}

function boot() {
	// 首次直接访问：等 DOM 就绪
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", schedule);
	} else {
		schedule();
	}

	// Swup 软导航：内容替换完成后触发
	document.addEventListener("swup:page:view", schedule);

	// 兜底：某些 Swup 版本/配置下 content:replace 更早，也监听上
	document.addEventListener("swup:content:replace", schedule);

	// 浏览器前进/后退
	window.addEventListener("popstate", schedule);
}

boot();
