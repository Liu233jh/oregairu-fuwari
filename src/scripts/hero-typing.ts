/**
 * 开屏打字机
 *
 * ⚠️ 为什么单独成模块：
 *   Astro 会把 <script> 提升到 <main> 之外，而 Swup 只替换 <main>，
 *   所以页面内脚本在软导航后不会重跑。详见 page-init.ts 顶部说明。
 *
 * 内容说明：这里的两句是**站点招呼语**，不是作品台词，
 * 所以不给任何角色署名 —— 不想让装饰性文案被误读成原著语录。
 */

const TYPE_MS = 115; // 每打一个字
const ERASE_MS = 45; // 每擦一个字
const HOLD_MS = 2400; // 打完停留
const GAP_MS = 420; // 擦完停顿

let timer: number | null = null;

/** 清理：Swup 换页时调用，否则定时器会一直跑在已移除的节点上 */
export function destroyHeroTyping() {
	if (timer !== null) {
		clearTimeout(timer);
		timer = null;
	}
}

export function initHeroTyping() {
	destroyHeroTyping();

	const host = document.querySelector<HTMLElement>("[data-hero-typing]");
	if (!host) return;

	const out = host.querySelector<HTMLElement>(".hf-typing-text");
	if (!out) return;

	let lines: string[] = [];
	try {
		lines = JSON.parse(host.dataset.heroTyping || "[]");
	} catch {
		lines = [];
	}
	if (!lines.length) return;

	// 用户要求减少动态效果：不打字，直接静态显示第一句
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
		out.textContent = lines[0];
		host.classList.add("is-static");
		return;
	}

	let li = 0;
	let ci = 0;
	let erasing = false;

	const step = () => {
		const line = lines[li];

		if (!erasing) {
			ci++;
			out.textContent = line.slice(0, ci);
			if (ci >= line.length) {
				// 打完 → 停一会儿 → 开始擦
				erasing = true;
				timer = window.setTimeout(step, HOLD_MS);
				return;
			}
			timer = window.setTimeout(step, TYPE_MS);
			return;
		}

		ci--;
		out.textContent = line.slice(0, Math.max(0, ci));
		if (ci <= 0) {
			// 擦完 → 换下一句
			erasing = false;
			li = (li + 1) % lines.length;
			timer = window.setTimeout(step, GAP_MS);
			return;
		}
		timer = window.setTimeout(step, ERASE_MS);
	};

	step();
}
