/**
 * 首页通栏 / 侧栏下移的测量
 *
 * ⚠️ 为什么这里必须用 JS：
 *   全屏开屏和群像带要贴满视口宽度，但它们在 <main> 里，而 <main> 只是
 *   `#main-grid` 两列布局（17.5rem 侧边栏 + 主列）的右列 ——
 *   它的包含块并不在视口中间。
 *
 *   纯 CSS 那套 `margin-left: calc(50% - 50vw)` 只在「包含块居中」时才成立。
 *   这里的实测结果是：宽度算对了 1500px，但整体右偏 148px，撑出横向滚动条。
 *   想纯 CSS 修就得硬编码侧边栏宽度/间距/内边距，跟 fuwari 的布局实现绑死，
 *   以后改一点就错。所以干脆直接量。
 *
 * 产出两个 CSS 变量：
 *   --bleed-left / --bleed-right  通栏用（<main> 到视口左右边的距离）
 *   --home-lead                   首页侧栏的下移量
 *                                 （= 群像带底边到 main 顶边的距离，
 *                                   也就是「点箭头跳过去」之后的内容起点；
 *                                   开屏是全屏的，侧栏不下移就会被它盖住）
 */

let onResize: (() => void) | null = null;

export function destroyPageBleed() {
	if (onResize) {
		window.removeEventListener("resize", onResize);
		onResize = null;
	}
}

export function initPageBleed() {
	destroyPageBleed();

	const main = document.getElementById("swup-container");
	const root = document.documentElement;
	if (!main) return;

	// 只有首页那两个通栏块需要；别的页面把变量清掉，免得留下脏值
	if (!main.querySelector(".hero-full, .wa-band")) {
		root.style.removeProperty("--bleed-left");
		root.style.removeProperty("--bleed-right");
		root.style.removeProperty("--home-lead");
		return;
	}

	const apply = () => {
		const r = main.getBoundingClientRect();
		// 右边界用 clientWidth（不含经典滚动条），否则会正好多出滚动条那 15px
		const right = document.documentElement.clientWidth;
		root.style.setProperty("--bleed-left", `${Math.round(r.left)}px`);
		root.style.setProperty("--bleed-right", `${Math.round(right - r.right)}px`);

		const band = main.querySelector(".wa-band");
		if (band) {
			const lead = Math.round(band.getBoundingClientRect().bottom - r.top);
			root.style.setProperty("--home-lead", `${lead}px`);
		} else {
			root.style.removeProperty("--home-lead");
		}
	};

	apply();
	onResize = apply;
	window.addEventListener("resize", onResize);
}
