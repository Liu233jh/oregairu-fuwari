/**
 * 角色页 Live2D 逻辑（雪之下雪乃 / 由比滨结衣 共用）
 *
 * ⚠️ 为什么放在这里而不是页面 .astro 里：
 *   fuwari 用 Swup 做软导航，它只替换 <main>（id="swup-container"）。
 *   Astro 会把 <script> 提升到 <main> 之外，所以页面内的脚本在软导航后
 *   【不会重新执行】。因此页面逻辑必须做成「可重复调用」的模块，
 *   由 Layout 里的全局调度器在 swup:page:view 时调用。
 *
 * 页面用哪个角色由舞台元素上的 data-character 决定：
 *   <div class="l2d-stage" id="l2d-stage" data-character="yui">
 * 这样同一份逻辑就能驱动两个角色，不需要复制一整个模块。
 *
 * 本文件对齐了原始 Windows 版桌面程序的全部功能，
 * 并在移植过程中修掉了 7 个问题，逐条标注在下面（★ 修复 N）。
 */

import {
	ACTION_GROUPS,
	ACTION_NAMES,
	EFFECT_HOLD,
	EFFECT_PARAMS,
	EXPRESSIONS,
	LIVE2D_CHARACTERS,
	MOUTH_PARAM,
	PARAM_OVERRIDES,
	POSE_GROUPS,
	RUNTIME_SCRIPTS,
	TRANSITIONS,
	type Live2DCharacter,
} from "./live2d-model-info";

const MOTION_PRIORITY_FORCE = 3;

/** Action 组下标 → 姿态下标，由 ACTION_GROUPS.pose 推导，保证两边不会不同步 */
const POSE_ACTION_TO_POSE: Record<number, number> = {};
for (const [pose, actionIdx] of ACTION_GROUPS.pose.entries()) {
	POSE_ACTION_TO_POSE[actionIdx] = pose;
}
const EFFECT_ACTION_SET = new Set<number>([...ACTION_GROUPS.effect]);
const EYE_OPEN_PARAMS = ["PARAM_EYE_L_OPEN", "PARAM_EYE_R_OPEN"];

/** 特效动作的淡入/淡出时长（秒），见 patchEffectMotions 的说明 */
const EFFECT_FADE_IN = 0.1;
const EFFECT_FADE_OUT = 0;

// ── 状态 ──
/** 当前页面的角色配置，initLive2D 时按 data-character 决定 */
let character: Live2DCharacter = LIVE2D_CHARACTERS.yukino;
let app: any = null;
let model: any = null;
let booting = false;

let follow = true;
let speaking = false;
/** 当前姿态下标 0/1/2 */
let poseIndex = 0;
/** 当前开启的特效动作下标，null 表示没有特效 */
let activeEffect: number | null = null;
/** 用来作废「过期的异步动作」（切页面 / 连点） */
let actionSeq = 0;

/** 需要在销毁时摘掉的监听 */
let stageEl: HTMLElement | null = null;
let onPointerMove: ((e: PointerEvent) => void) | null = null;
let onPointerLeave: (() => void) | null = null;
let lipSyncHandler: (() => void) | null = null;
let eyeLockHandler: (() => void) | null = null;
let motionFinishHandler: (() => void) | null = null;
let effectHoldHandler: (() => void) | null = null;
let windowBound = false;

// ── 小工具 ──
function coreModel(): any {
	return model?.internalModel?.coreModel ?? null;
}

function setStatus(text: string) {
	const el = document.getElementById("l2d-status");
	if (el) el.textContent = text;
}

function setHint(text: string) {
	const el = document.getElementById("l2d-hint");
	if (el) el.textContent = text;
}

function markActive(rowId: string, predicate: (btn: HTMLElement) => boolean) {
	const row = document.getElementById(rowId);
	if (!row) return;
	row.querySelectorAll<HTMLElement>("button").forEach((b) => {
		b.classList.toggle("active", predicate(b));
	});
}

// ── 动态加载运行时（软导航进来的话，运行时还没加载） ──
function loadScript(src: string): Promise<void> {
	return new Promise((resolve, reject) => {
		if (document.querySelector(`script[src="${src}"]`)) {
			resolve();
			return;
		}
		const s = document.createElement("script");
		s.src = src;
		s.onload = () => resolve();
		s.onerror = () => reject(new Error("无法加载 " + src));
		document.head.appendChild(s);
	});
}

async function ensureRuntime(): Promise<void> {
	const w = window as any;
	if (w.PIXI?.live2d?.Live2DModel) return;
	// 顺序不可变：core 必须在 cubism4 之前
	for (const src of RUNTIME_SCRIPTS) {
		await loadScript(src);
	}
	if (!w.PIXI?.live2d) {
		throw new Error("Live2D 运行时加载后仍未就绪");
	}
}

function showError(title: string, detail: string) {
	const loading = document.getElementById("l2d-loading");
	if (!loading) return;
	loading.classList.remove("hidden");
	loading.innerHTML =
		'<div class="text-center px-6 max-w-md">' +
		`<div class="mb-2 font-semibold">${title}</div>` +
		`<div class="text-xs opacity-75 leading-relaxed break-all">${detail}</div>` +
		'</div>';
}

// ── 画面适配 ──

/**
 * 缩放基准高度。
 *
 * 舞台的 CSS 高度比这个值矮（见 custom.css 的 .l2d-stage），
 * 多出来的部分由 canvas 承担并被 overflow 裁掉 ——
 * 目的是让下面的卡片能露出来一截，**但人物大小完全不变**。
 * 如果直接按舞台高度算缩放，舞台一变矮人物就会跟着缩小，那就不是用户要的效果了。
 */
const REF_STAGE_H = 640;
/**
 * 裁切偏好：溢出部分里有多少比例裁在下方（0.5 = 上下各裁一半，1 = 只裁下方）。
 * 取偏大的值，优先保住头部。
 */
const CROP_BIAS = 0.88;

function fitModel() {
	const canvas = document.getElementById("l2d-canvas") as HTMLCanvasElement | null;
	if (!canvas || !model) return;
	const w = canvas.clientWidth;
	const h = canvas.clientHeight;
	if (!w || !h) return;
	const mw = model.internalModel.width;
	const mh = model.internalModel.height;
	// 用基准高度而不是实际高度算缩放 → 舞台变矮时人物不变大也不变小
	const refH = Math.max(h, REF_STAGE_H);
	const scale = Math.min(w / mw, refH / mh) * 0.95;
	model.scale.set(scale);
	model.anchor.set(0.5, 0.5);
	model.x = w / 2;
	// 溢出部分按 CROP_BIAS 分配：多裁下方，少裁上方
	const overflow = Math.max(0, mh * scale - h);
	model.y = h / 2 + overflow * (CROP_BIAS - 0.5);
}

// ══════════════════════════════════════════════════════════
//  视线跟随
// ══════════════════════════════════════════════════════════

function focusAt(clientX: number, clientY: number) {
	if (!model || !stageEl || !follow) return;
	const r = stageEl.getBoundingClientRect();
	if (!r.width || !r.height) return;
	const x = Math.max(-1, Math.min(1, ((clientX - r.left) / r.width) * 2 - 1));
	const y = Math.max(-1, Math.min(1, 1 - ((clientY - r.top) / r.height) * 2));
	try {
		model.internalModel.focusController.focus(x, y);
	} catch (_) {}
}

/**
 * ★ 修复 6：特效动作「点了几乎看不出变化」
 *
 * 这 6 个特效动作在 model3.json 里的 FadeIn/FadeOut 都是 1~2 秒，
 * 而动作本身只有 0.5~1.3 秒 —— 淡入淡出比动作还长时，混合权重
 * 永远爬不到 1，参数只升到 50% 上下就冻住：
 *   汗颜 PARAM_SWEAT 只到 0.575、生气 PARAM_ANGER_1 只到 0.674、
 *   挑眉 PARAM_BROW_L_PIKU 的抽动只有 0.034（几乎看不见）。
 *
 * 已用同一浏览器、同一模型跑原始 Windows 版桌面程序对比过，数值一致
 * （汗颜 0.575 / 生气 0.674 / 挑眉 0.005），所以这是模型自带的毛病，不是移植问题。
 *
 * 处理：预加载这几个动作实例，把淡入压到 0.1 秒、淡出设为 0。
 * 淡出必须为 0 —— 试过 0.05 会让挑眉在结束时残留 -0.15 的负值。
 * 实测改完后：汗颜/泪眼/阴沉/生气都到满值 1.000，挑眉抽动幅度 0.690 且回落到 0。
 */
async function patchEffectMotions() {
	const mm = model?.internalModel?.motionManager;
	if (!mm || typeof mm.loadMotion !== "function") return;
	for (const idx of ACTION_GROUPS.effect) {
		try {
			const motion = await mm.loadMotion("Action", idx);
			if (motion && typeof motion.setFadeInTime === "function") {
				motion.setFadeInTime(EFFECT_FADE_IN);
				motion.setFadeOutTime(EFFECT_FADE_OUT);
			}
		} catch (err) {
			console.warn("[Live2D] 预加载特效动作失败", idx, err);
		}
	}
}

function resetFocus() {
	try {
		model?.internalModel?.focusController?.focus(0, 0);
	} catch (_) {}
}

// ══════════════════════════════════════════════════════════
//  特效参数清理 / 口型 / 强制闭眼
// ══════════════════════════════════════════════════════════

/**
 * ★ 修复 3：特效动作是一次性叠加动作，播完后参数会残留。
 * 关闭特效时必须把 EFFECT_PARAMS 全清零再 saveParameters()。
 */
function clearEffectParams() {
	const core = coreModel();
	if (!core) return;
	for (const id of EFFECT_PARAMS) {
		try {
			core.setParameterValueById(id, 0);
		} catch (_) {}
	}
	try {
		core.saveParameters();
	} catch (_) {}
}

/**
 * ★ 新增 4：模拟说话（口型演示）
 * 原始程序没有音频，是用两条正弦波程序化驱动 PARAM_MOUTH_OPEN_Y，
 * 每 3.6 秒里留 0.75 秒闭口当作换气停顿。
 */
function startLipSync() {
	const im = model?.internalModel;
	if (!im || lipSyncHandler) return;
	const t0 = performance.now();
	lipSyncHandler = () => {
		const t = (performance.now() - t0) / 1000;
		const pause = t % 3.6 > 2.85;
		const wave = Math.abs(Math.sin(t * 8.8) * 0.7 + Math.sin(t * 13.7) * 0.3);
		const envelope = 0.72 + Math.sin(t * 2.15) * 0.18;
		const open = pause ? 0 : Math.min(1, 0.08 + wave * envelope);
		try {
			im.coreModel.setParameterValueById(MOUTH_PARAM, open);
		} catch (_) {}
	};
	im.on("beforeModelUpdate", lipSyncHandler);
}

function stopLipSync() {
	const im = model?.internalModel;
	if (im && lipSyncHandler) {
		try {
			im.off("beforeModelUpdate", lipSyncHandler);
		} catch (_) {}
	}
	lipSyncHandler = null;
	try {
		im?.coreModel?.setParameterValueById(MOUTH_PARAM, 0);
	} catch (_) {}
}

/** ★ 修复 5：ジト目表情要压住自动眨眼 */
function startEyeLock() {
	const im = model?.internalModel;
	if (!im || eyeLockHandler) return;
	eyeLockHandler = () => {
		for (const id of EYE_OPEN_PARAMS) {
			try {
				im.coreModel.setParameterValueById(id, 0);
			} catch (_) {}
		}
	};
	im.on("beforeModelUpdate", eyeLockHandler);
}

function stopEyeLock() {
	const im = model?.internalModel;
	if (im && eyeLockHandler) {
		try {
			im.off("beforeModelUpdate", eyeLockHandler);
		} catch (_) {}
	}
	eyeLockHandler = null;
}

/**
 * ★ 修复 7：特效动作的「保持值」
 * 泪眼（yuk_uruuru）是一条闪烁曲线，末值回到 0，放完什么都不剩。
 * 动作放完后按 EFFECT_HOLD 把参数钉住，让它变成持续状态。
 */
function startEffectHold(index: number) {
	const im = model?.internalModel;
	const hold = EFFECT_HOLD[index];
	if (!im || !hold || Object.keys(hold).length === 0) return;
	if (effectHoldHandler) {
		try {
			im.off("beforeModelUpdate", effectHoldHandler);
		} catch (_) {}
	}
	effectHoldHandler = () => {
		for (const id in hold) {
			try {
				im.coreModel.setParameterValueById(id, hold[id]);
			} catch (_) {}
		}
	};
	im.on("beforeModelUpdate", effectHoldHandler);
}

function stopEffectHold() {
	const im = model?.internalModel;
	if (im && effectHoldHandler) {
		try {
			im.off("beforeModelUpdate", effectHoldHandler);
		} catch (_) {}
	}
	effectHoldHandler = null;
}

// ══════════════════════════════════════════════════════════
//  姿态 / 动作
// ══════════════════════════════════════════════════════════

/**
 * ★ 修复 1（用户报的「选了手搭手/抱臂思考又跳回撩头发」）：
 *
 * pixi-live2d-display 的 MotionManager 有一个 idleMotionGroup（默认 "Idle"）：
 * 当前动作播完后会自动从 Idle 组里随机挑一个继续播。
 * 而本模型的 Idle 组里放的是 yuk_pose1_idle（= 撩头发），
 * 所以不管切到哪个姿态，动作一结束就被 Idle 组拽回撩头发。
 *
 * 修法（原始程序也是这么做的）：切姿态时把 groups.idle 也改成对应的姿态组，
 * 这样回落到待机时播的就是同一个姿态。
 */
function applyIdleGroup(group: string) {
	const mm = model?.internalModel?.motionManager;
	if (mm?.groups) mm.groups.idle = group;
}

function currentPoseGroup(): string {
	return POSE_GROUPS[poseIndex] ?? "Pose1";
}

function refreshTransitionButtons() {
	const row = document.getElementById("transition-row");
	if (!row) return;
	row.querySelectorAll<HTMLElement>("button").forEach((b) => {
		const idx = Number(b.dataset.actionidx);
		const t = TRANSITIONS[idx];
		const ok = !t || t.from === poseIndex;
		b.disabled = !ok;
		b.title = ok ? "" : `请先切换到姿态${["一", "二", "三"][t.from]}`;
	});
}

function refreshPoseButtons() {
	markActive("pose-row", (b) => Number(b.dataset.actionidx) === ACTION_GROUPS.pose[poseIndex]);
}

function refreshEffectButtons() {
	markActive("effect-row", (b) => Number(b.dataset.actionidx) === activeEffect);
	const row = document.getElementById("effect-row");
	row?.querySelectorAll<HTMLElement>("button").forEach((b) => {
		b.title = "再点一次关闭";
	});
}

/** 姿态过渡播放结束后回到当前姿态 */
function armMotionFinish() {
	const mm = model?.internalModel?.motionManager;
	if (!mm) return;
	if (motionFinishHandler) {
		try {
			mm.off("motionFinish", motionFinishHandler);
		} catch (_) {}
		motionFinishHandler = null;
	}
	const seq = actionSeq;
	motionFinishHandler = () => {
		if (seq !== actionSeq) return;
		setStatus(`当前姿态 · ${ACTION_NAMES[ACTION_GROUPS.pose[poseIndex]]}`);
		refreshPoseButtons();
	};
	try {
		mm.once("motionFinish", motionFinishHandler);
	} catch (_) {}
}

async function playMotion(group: string, index: number): Promise<boolean> {
	try {
		return Boolean(await model?.motion(group, index, MOTION_PRIORITY_FORCE));
	} catch (err) {
		console.warn("[Live2D] motion", group, index, err);
		return false;
	}
}

/**
 * 动作总入口，严格按原始程序的优先级分支。
 */
async function runAction(index: number) {
	if (!model) return;
	const seq = ++actionSeq;

	// ① 姿态：切过去并同步 idle 组
	const pose = POSE_ACTION_TO_POSE[index];
	if (pose !== undefined) {
		poseIndex = pose;
		refreshPoseButtons();
		refreshTransitionButtons();
		applyIdleGroup(currentPoseGroup());
		setStatus(`当前姿态 · ${ACTION_NAMES[index]}`);
		await playMotion(currentPoseGroup(), 0);
		return;
	}

	// ② 特效动作：开关式
	if (EFFECT_ACTION_SET.has(index)) {
		// 再点同一个 → 关闭
		if (activeEffect === index) {
			activeEffect = null;
			stopEffectHold();
			refreshEffectButtons();
			await playMotion(currentPoseGroup(), 0);
			if (seq !== actionSeq) return;
			clearEffectParams();
			setStatus(`已关闭 · ${ACTION_NAMES[index]}`);
			return;
		}
		// 先关掉上一个特效
		if (activeEffect !== null) {
			stopEffectHold();
			await playMotion(currentPoseGroup(), 0);
			clearEffectParams();
			if (seq !== actionSeq) return;
		}
		activeEffect = index;
		refreshEffectButtons();
		setStatus(`已开启 · ${ACTION_NAMES[index]}（再点一次关闭）`);

		// 动作放完后按 EFFECT_HOLD 把参数钉住（泪眼是闪烁曲线，末值为 0，必须保持）
		const mm = model?.internalModel?.motionManager;
		const holdAfterFinish = () => {
			if (seq === actionSeq && activeEffect === index) startEffectHold(index);
		};
		try {
			mm?.once("motionFinish", holdAfterFinish);
		} catch (_) {}

		const ok = await playMotion("Action", index);
		if (seq !== actionSeq) return;
		if (!ok) {
			try {
				mm?.off("motionFinish", holdAfterFinish);
			} catch (_) {}
			activeEffect = null;
			refreshEffectButtons();
			setStatus(`当前姿态 · ${ACTION_NAMES[ACTION_GROUPS.pose[poseIndex]]}`);
		}
		return;
	}

	// ③ 姿态过渡：先落到目标姿态，再播过渡动作
	const trans = TRANSITIONS[index];
	if (trans) {
		poseIndex = trans.to;
		refreshPoseButtons();
		refreshTransitionButtons();
		applyIdleGroup(currentPoseGroup());
	}

	// ④ 普通动作
	setStatus(`正在播放 · ${ACTION_NAMES[index]}`);
	armMotionFinish();
	const ok = await playMotion("Action", index);
	if (seq !== actionSeq) return;
	if (!ok) setStatus(`当前姿态 · ${ACTION_NAMES[ACTION_GROUPS.pose[poseIndex]]}`);
}

function applyExpression(i: number) {
	if (!model) return;
	if (character.eyeLockExpressions.includes(i)) startEyeLock();
	else stopEyeLock();
	try {
		model.expression(i);
	} catch (err) {
		console.warn("[Live2D] expression", err);
	}
	setStatus(`当前表情 · ${EXPRESSIONS[i] ?? i}`);
	markActive("expr-row", (b) => Number(b.dataset.expr) === i);
}

// ══════════════════════════════════════════════════════════
//  加载模型
// ══════════════════════════════════════════════════════════

async function loadModel(key: string) {
	const PIXI = (window as any).PIXI;
	const canvas = document.getElementById("l2d-canvas") as HTMLCanvasElement | null;
	if (!canvas || !app) return;

	const loading = document.getElementById("l2d-loading")!;
	loading.classList.remove("hidden");
	setHint(
		key === character.outfits[0].key
			? `正在换上${character.outfits[0].label}…`
			: `正在换上${character.outfits[1]?.label ?? key}…`,
	);

	const slow = window.setTimeout(() => setHint("模型较大，仍在加载中…"), 3000);
	const old = model;

	/*
	 * ⏱ 超时与进度提示
	 *
	 * 原来这里是硬编码 30 秒，`Promise.race` 一到点就抛错。在国内访问
	 * GitHub Pages 的实测里，雪乃模型 8 个请求 / 1.1 MB，最后一张贴图
	 * 要 48.8 秒才下完（约 10 KB/s）—— **必然超时**，用户看到的就是
	 * 「模型加载失败 / 加载超时（30 秒）」。
	 *
	 * 而且 `Promise.race` 不会取消输掉的那个 promise：超时后
	 * `Live2DModel.from()` 其实还在后台继续下，但结果没人接手，
	 * 所以模型永远出不来。
	 *
	 * 现在改成：
	 *   1. 超时放宽到 120 秒（慢网也要让它下完）
	 *   2. 每 5 秒把「已用多少秒」写进提示，用户能看出在进展而不是卡死
	 *   3. 两个计时器都在 finally 里清掉
	 */
	const LOAD_TIMEOUT_MS = 120_000;
	const startedAt = Date.now();
	const tick = window.setInterval(() => {
		const s = Math.round((Date.now() - startedAt) / 1000);
		setHint(`模型较大，仍在加载中…（已 ${s} 秒）`);
	}, 5000);

	try {
		const timeout = new Promise((_, reject) =>
			window.setTimeout(
				() => reject(new Error(`加载超时（${LOAD_TIMEOUT_MS / 1000} 秒）`)),
				LOAD_TIMEOUT_MS,
			),
		);

		const next: any = await Promise.race([
			PIXI.live2d.Live2DModel.from(character.models[key], { autoInteract: false }),
			timeout,
		]);

		if (!app) {
			try {
				next.destroy();
			} catch (_) {}
			return;
		}

		app.stage.addChild(next);
		model = next;

		// ★ 修复 1：覆盖参数 ID，否则视线跟随静默失效
		Object.assign(next.internalModel, PARAM_OVERRIDES);

		fitModel();
		(window as any).__live2d = next;
		(window as any).__yukino2d = next; // 兼容早期测试脚本用的旧名字

		// ★ 修复 6：预加载 6 个特效动作并修正淡入淡出（必须在换装后重新做一次）
		void patchEffectMotions();

		// 换装后重置演出状态（对齐原始程序：表情回到 0、特效关闭）
		stopEffectHold();
		activeEffect = null;
		refreshEffectButtons();

		// 初始状态：表情 0 + 当前姿态常驻
		await next.expression(0);
		markActive("expr-row", (b) => Number(b.dataset.expr) === 0);
		applyIdleGroup(currentPoseGroup());
		await playMotion(currentPoseGroup(), 0);

		// 运行中的演示需要在换装后重新挂到新模型上
		if (speaking) {
			stopLipSync();
			startLipSync();
		}

		if (old) {
			try {
				app.stage.removeChild(old);
				old.destroy();
			} catch (_) {}
		}

		loading.classList.add("hidden");
		setHint("");
		setStatus(`当前姿态 · ${ACTION_NAMES[ACTION_GROUPS.pose[poseIndex]]}`);
	} catch (err) {
		const msg = String((err as Error)?.message || err);
		console.error("[Live2D]", err);
		showError("模型加载失败", `${msg}｜模型地址：${character.models[key]}`);
	} finally {
		window.clearTimeout(slow);
		window.clearInterval(tick);
	}
}

// ══════════════════════════════════════════════════════════
//  按钮绑定
// ══════════════════════════════════════════════════════════

function bindActionRow(rowId: string) {
	const row = document.getElementById(rowId);
	if (!row) return;
	row.addEventListener("click", (e) => {
		const btn = (e.target as HTMLElement).closest("button") as HTMLButtonElement | null;
		if (!btn || btn.disabled) return;
		const idx = Number(btn.dataset.actionidx);
		if (Number.isNaN(idx)) return;
		void runAction(idx);
	});
}

function bindAll() {
	stageEl = document.getElementById("l2d-stage");

	if (stageEl) {
		onPointerMove = (e: PointerEvent) => focusAt(e.clientX, e.clientY);
		onPointerLeave = () => resetFocus();
		stageEl.addEventListener("pointermove", onPointerMove);
		stageEl.addEventListener("pointerleave", onPointerLeave);
	}

	const followBox = document.getElementById("opt-follow") as HTMLInputElement | null;
	if (followBox) {
		follow = followBox.checked;
		followBox.addEventListener("change", () => {
			follow = followBox.checked;
			if (!follow) resetFocus();
			setStatus(follow ? "目光跟随已开启" : "目光跟随已关闭");
		});
	}

	const speakBox = document.getElementById("opt-speak") as HTMLInputElement | null;
	if (speakBox) {
		speaking = speakBox.checked;
		speakBox.addEventListener("change", () => {
			speaking = speakBox.checked;
			if (speaking) {
				startLipSync();
				setStatus("正在演示说话口型…");
			} else {
				stopLipSync();
				setStatus("口型演示已停止");
			}
		});
		if (speaking) startLipSync();
	}

	const exprRow = document.getElementById("expr-row");
	exprRow?.addEventListener("click", (e) => {
		const btn = (e.target as HTMLElement).closest("button") as HTMLButtonElement | null;
		if (!btn || btn.disabled) return;
		applyExpression(Number(btn.dataset.expr));
	});

	const outfitRow = document.getElementById("outfit-row");
	outfitRow?.addEventListener("click", (e) => {
		const btn = (e.target as HTMLElement).closest("button") as HTMLButtonElement | null;
		if (!btn || btn.disabled) return;
		outfitRow.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
		btn.classList.add("active");
		void loadModel(String(btn.dataset.outfit));
	});

	for (const id of ["pose-row", "effect-row", "motion-row", "transition-row"]) {
		bindActionRow(id);
	}

	refreshPoseButtons();
	refreshEffectButtons();
	refreshTransitionButtons();
}

// ══════════════════════════════════════════════════════════
//  生命周期
// ══════════════════════════════════════════════════════════

/** 销毁上一页的实例（软导航离开角色页时调用） */
export function destroyLive2D() {
	stopLipSync();
	stopEyeLock();
	stopEffectHold();

	if (stageEl) {
		if (onPointerMove) stageEl.removeEventListener("pointermove", onPointerMove);
		if (onPointerLeave) stageEl.removeEventListener("pointerleave", onPointerLeave);
	}
	stageEl = null;
	onPointerMove = null;
	onPointerLeave = null;

	const mm = model?.internalModel?.motionManager;
	if (mm && motionFinishHandler) {
		try {
			mm.off("motionFinish", motionFinishHandler);
		} catch (_) {}
	}
	motionFinishHandler = null;

	if (model) {
		try {
			model.destroy();
		} catch (_) {}
		model = null;
	}
	if (app) {
		try {
			app.destroy(true, { children: true });
		} catch (_) {}
		app = null;
	}
	(window as any).__live2d = null;
	(window as any).__yukino2d = null;
	actionSeq++;
}

/** 初始化（幂等：重复调用不会重复创建） */
export async function initLive2D() {
	const canvas = document.getElementById("l2d-canvas") as HTMLCanvasElement | null;
	if (!canvas) return; // 不在角色页
	if (app || booting) return; // 已初始化 / 正在初始化

	// 用舞台元素上的 data-character 决定加载哪个角色；缺省按雪乃
	const stage = document.getElementById("l2d-stage");
	const key = stage?.dataset.character;
	character = LIVE2D_CHARACTERS[key as keyof typeof LIVE2D_CHARACTERS] ?? LIVE2D_CHARACTERS.yukino;

	booting = true;

	const loading = document.getElementById("l2d-loading");

	setHint((window as any).PIXI ? "脚本已启动，检查运行时…" : "正在加载 Live2D 运行时…");

	try {
		await ensureRuntime();
		if (!canvas.isConnected) return; // 加载期间页面已被替换

		loading?.classList.remove("hidden");
		setHint("正在初始化舞台…");

		const PIXI = (window as any).PIXI;
		app = new PIXI.Application({
			view: canvas,
			backgroundAlpha: 0,
			resizeTo: canvas.parentElement,
			antialias: true,
			autoDensity: true,
			resolution: Math.min(window.devicePixelRatio || 1, 2),
		});

		// 窗口级监听只挂一次
		if (!windowBound) {
			windowBound = true;
			window.addEventListener("resize", fitModel);
		}

		bindAll();
		await loadModel(character.outfits[0].key);
	} catch (err) {
		const msg = String((err as Error)?.message || err);
		console.error("[Live2D init]", err);
		showError("Live2D 初始化失败", msg);
	} finally {
		booting = false;
	}
}
