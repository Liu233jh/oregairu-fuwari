/**
 * 角色页「她说」板块的挑选规则
 *
 * 之前是直接按 order 取前 6 条，挑出来的不一定是最金句的。
 * 现在按「外部依据的强弱」排序 + **设质量门槛**：
 *
 *   1. f*.md —— 我逐条对着原著核对过出处和归属的 23 条
 *   2. A 档 —— 网络名言集里找到、又回到原著精确定位的
 *   3. B 档 —— 萌娘百科粉丝整理的语录段
 *   4. 旧 q*.md —— 早期启发式提取的（只在必要时兜底）
 *
 * ★ 关键：以前不管池子够不够都会填满 6 条，结果一色这种只有 1 条精选的角色
 *   也被塞进 5 条普通对话。现在**宁可少显示，也不掺水** ——
 *   达不到门槛就显示更少，页面副标题会写明实际条数。
 */

export interface QuoteLike {
	/** content collection 的 id，用来区分 f*.md（人工精选）和 q*.md */
	id?: string;
	data: {
		character: string;
		featured?: boolean;
		score?: number;
		order: number;
		text?: string;
	};
}

/** 依据强度分级，数字越大越权威 */
function rankOf(q: QuoteLike): number {
	if (q.id?.startsWith("f")) return 100; // 人工逐条核对过出处
	const s = q.data.score ?? 0;
	if (s >= 30) return 90; // A 档：网络名言集 + 原著定位
	if (s >= 28) return 80; // B 档：萌娘语录段（雪乃 / 八幡）
	if (s >= 24) return 70; // B 档：萌娘剧情摘要（结衣）
	if (q.data.featured) return 60;
	return 40;
}

/** 金句门槛：有外部依据的才算 */
const BAR_STRONG = 70;
/** 兜底门槛：至少要是标记过精选的 */
const BAR_WEAK = 60;

/** 长度越接近这个值，越像能单独引用的金句 */
const IDEAL_LEN = 30;

/**
 * 取某个角色「最金句」的前 n 条。
 *
 * 门槛策略：
 *   · 先只看有外部依据的（f/A/B）
 *   · 如果不足 3 条，放宽到「标记过精选的」
 *   · 仍然不足就如实显示少的条数，不拿普通对话填满
 */
export function pickTopQuotes<T extends QuoteLike>(quotes: T[], char: string, n = 6): T[] {
	const pool = quotes.filter((q) => q.data.character === char);

	const sortBy = (arr: T[]) =>
		[...arr].sort((a, b) => {
			const ra = rankOf(a);
			const rb = rankOf(b);
			if (ra !== rb) return rb - ra;
			const sa = a.data.score ?? 0;
			const sb = b.data.score ?? 0;
			if (sa !== sb) return sb - sa;
			// 长度偏好：金句通常不长，过长多半是场景台词
			const la = Math.abs((a.data.text?.length ?? IDEAL_LEN) - IDEAL_LEN);
			const lb = Math.abs((b.data.text?.length ?? IDEAL_LEN) - IDEAL_LEN);
			if (la !== lb) return la - lb;
			return a.data.order - b.data.order;
		});

	let picked = sortBy(pool.filter((q) => rankOf(q) >= BAR_STRONG)).slice(0, n);
	if (picked.length < 3) {
		picked = sortBy(pool.filter((q) => rankOf(q) >= BAR_WEAK)).slice(0, n);
	}
	return picked;
}

/** 该角色在库里一共有多少条（用于「查看全部」旁边的计数） */
export function countQuotes(quotes: QuoteLike[], char: string): number {
	return quotes.filter((q) => q.data.character === char).length;
}

/** 该角色达到「金句门槛」的有多少条（用于副标题说明） */
export function countStrongQuotes(quotes: QuoteLike[], char: string): number {
	return quotes.filter((q) => q.data.character === char && rankOf(q) >= BAR_STRONG).length;
}
