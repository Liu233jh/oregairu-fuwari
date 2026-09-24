/**
 * 开屏底部的下箭头：点一下滚到下一屏
 *
 * ⚠️ 为什么单独成模块：
 *   Astro 会把 <script> 提升到 <main> 之外，而 Swup 只替换 <main>，
 *   页面内脚本在软导航后不会重跑。详见 page-init.ts 顶部说明。
 *
 * 不用 <a href="#..."> 的原因：Swup 会接管站内链接，
 * hash 链接在不同版本下行为不一致，直接给 button 更可控。
 */

let btn: HTMLElement | null = null;
let onClick: (() => void) | null = null;

export function destroyHeroScroll() {
	if (btn && onClick) {
		btn.removeEventListener("click", onClick);
	}
	btn = null;
	onClick = null;
}

export function initHeroScroll() {
	destroyHeroScroll();

	const el = document.querySelector<HTMLElement>("[data-hero-scroll]");
	if (!el) return;

	btn = el;
	onClick = () => {
		// 开屏正好一屏高，所以「下一屏」= 群像带的顶部。
		// 拿元素实测位置而不是硬写 window.innerHeight，免得以后改高度就错位。
		const target = document.getElementById("home-next");
		const top = target
			? target.getBoundingClientRect().top + window.scrollY
			: window.innerHeight;

		// 开了「减少动态效果」就别滚动动画，直接跳
		const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
	};
	btn.addEventListener("click", onClick);
}
