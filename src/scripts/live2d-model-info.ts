import { url } from "../utils/url-utils";
/**
 * Live2D 模型的静态信息（雪之下雪乃 / 由比滨结衣 共用一套结构）
 *
 * 这个文件同时被两边引用：
 *   · 角色页 .astro（构建时，用来渲染按钮）
 *   · live2d-page.ts（运行时，用来决定点哪个按钮做什么）
 * 放一起是为了避免「按钮清单」和「动作逻辑」两份列表对不上。
 *
 * 数据来源：<角色>_*.model3.json 的 FileReferences.Motions.Action 数组，
 * 以及原始 Windows 版桌面程序里的名称表（两个角色的顺序完全一致）。
 */

// ══════════════════════════════════════════════════════════
//  角色配置
// ══════════════════════════════════════════════════════════

export type Live2DCharacterKey = "yukino" | "yui" | "iroha";

export interface Live2DCharacter {
	key: Live2DCharacterKey;
	/** 中文全名 */
	name: string;
	/** 中文简称，用于文案 */
	shortName: string;
	/** 模型目录 */
	base: string;
	/** 服装 key → 模型文件 */
	models: Record<string, string>;
	/** 服装按钮（顺序即显示顺序） */
	outfits: { key: string; label: string }[];
	/**
	 * 角色印象色 —— 按春物各角色的官方配色走：
	 *   雪之下雪乃 = 蓝、由比滨结衣 = 粉、一色彩羽 = 黄
	 * 用于角色页的舞台背景、标签、按钮。
	 */
	theme: {
		/** 主色（标签底、按钮描边） */
		accent: string;
		/** 深一档（文字） */
		accentDark: string;
		/** 极浅底（标签背景） */
		accentSoft: string;
		/** 舞台背景渐变（亮色模式） */
		stageFrom: string;
		stageMid: string;
		stageTo: string;
		/** 舞台背景渐变（暗色模式） */
		stageDarkFrom: string;
		stageDarkTo: string;
		/** 中央柔光颜色 */
		glow: string;
	};
	/**
	 * 需要「强制闭眼」覆盖的表达式下标。
	 *
	 * 雪乃的 em9（不悦）是ジト目：靠 PARAM_EYE_L_OPEN = -1 把眼睛完全压闭，
	 * 再靠 PARAM_EYE_L_JITO = 1 画出细眼。这时库的自动眨眼也在改同一组参数，
	 * 两者叠加会把效果打乱，所以要强行把开闭参数压成 0。
	 *
	 * 一色的 em1 / em7 / em13 都是闭眼笑（同样是 -1.0），需要同样处理。
	 * 结衣的 em9 虽然也有 JITO，但 PARAM_EYE_R_OPEN 只加了 -0.1（轻微眯眼），
	 * 不需要也不能强制闭眼 —— 原始结衣程序里也没有这个特殊处理，所以是空数组。
	 */
	eyeLockExpressions: number[];
}

export const LIVE2D_CHARACTERS: Record<Live2DCharacterKey, Live2DCharacter> = {
	yukino: {
		key: "yukino",
		name: "雪之下雪乃",
		shortName: "雪乃",
		base: url("/live2d/models/yukino/"),
		models: {
			seihuku: url("/live2d/models/yukino/yukino_seihuku.model3.json"),
			shihuku: url("/live2d/models/yukino/yukino_shihuku.model3.json"),
		},
		outfits: [
			{ key: "seihuku", label: "制服" },
			{ key: "shihuku", label: "私服" },
		],
		// 雪乃的印象色 = 蓝（和桌宠主色 #62b6ff 同源）
		theme: {
			accent: "#62b6ff",
			accentDark: "#2b7fd0",
			accentSoft: "#e8f3ff",
			stageFrom: "#f2f8ff",
			stageMid: "#e6f2ff",
			stageTo: "#d8eaff",
			stageDarkFrom: "#141c26",
			stageDarkTo: "#101720",
			glow: "rgba(110,180,255,.16)",
		},
		eyeLockExpressions: [9],
	},
	yui: {
		key: "yui",
		name: "由比滨结衣",
		shortName: "结衣",
		base: url("/live2d/models/yui/"),
		models: {
			seihuku: url("/live2d/models/yui/yui_seihuku.model3.json"),
			shihuku: url("/live2d/models/yui/yui_shihuku.model3.json"),
		},
		outfits: [
			{ key: "seihuku", label: "制服" },
			{ key: "shihuku", label: "私服" },
		],
		// 结衣的印象色 = 粉
		theme: {
			accent: "#f77fa8",
			accentDark: "#d9508a",
			accentSoft: "#fdeef5",
			stageFrom: "#fdeef5",
			stageMid: "#f9e3ef",
			stageTo: "#f3d7e9",
			stageDarkFrom: "#241a20",
			stageDarkTo: "#1a1419",
			glow: "rgba(255,157,190,.14)",
		},
		eyeLockExpressions: [],
	},
	iroha: {
		key: "iroha",
		name: "一色彩羽",
		shortName: "一色",
		base: url("/live2d/models/iroha/"),
		models: {
			seihuku: url("/live2d/models/iroha/iroha_seihuku.model3.json"),
			shihuku: url("/live2d/models/iroha/iroha_shihuku.model3.json"),
		},
		outfits: [
			{ key: "seihuku", label: "制服" },
			{ key: "shihuku", label: "私服" },
		],
		// 一色的印象色 = 黄
		theme: {
			accent: "#f0c04a",
			accentDark: "#b8860b",
			accentSoft: "#fff8e3",
			stageFrom: "#fffaf0",
			stageMid: "#fdf3d9",
			stageTo: "#f9ecc4",
			stageDarkFrom: "#262117",
			stageDarkTo: "#1a1710",
			glow: "rgba(245,200,110,.16)",
		},
		// 一色有三个「闭眼笑」表情，原始程序的写法是 new Set([1, 7, 13])
		eyeLockExpressions: [1, 7, 13],
	},
};

/**
 * 首页「角色」卡片。
 * page 为 null 表示模型还没移植 —— 这种情况下渲染成不可点的「敬请期待」，
 * 移植完只要把 page 填上就自动变成可点，不需要再改组件。
 */
export const CHARACTER_CARDS: {
	key: Live2DCharacterKey | null;
	name: string;
	emoji: string;
	org: string;
	page: string | null;
}[] = [
	{ key: "yukino", name: "雪之下雪乃", emoji: "❄️", org: "奉仕部", page: "/character/" },
	{ key: "yui", name: "由比滨结衣", emoji: "🍡", org: "奉仕部", page: "/yui/" },
	{ key: "iroha", name: "一色彩羽", emoji: "🎀", org: "学生会", page: "/iroha/" },
	{ key: null, name: "户冢彩加", emoji: "🎾", org: "网球部", page: null },
	{ key: null, name: "比企谷小町", emoji: "🍪", org: "比企谷家", page: null },
	{ key: null, name: "平冢静", emoji: "🚬", org: "指导老师", page: null },
];

// ══════════════════════════════════════════════════════════
//  两个角色完全共用的部分
// ══════════════════════════════════════════════════════════

/** 14 个表情，下标对应 <角色>_em{下标}.exp3.json */
export const EXPRESSIONS = [
	"平静",
	"微笑",
	"认真",
	"冷淡",
	"无奈",
	"汗颜",
	"审视",
	"侧目",
	"惊讶",
	"不悦",
	"困扰",
	"害羞",
	"脸红",
	"轻笑",
] as const;

/**
 * Action 组 27 个动作的中文名，下标 = Action 组内序号。
 * 雪乃和结衣的 model3.json 里 Action 数组顺序完全一致，所以共用这一份。
 * 顺序不能改。
 */
export const ACTION_NAMES = [
	"姿态一",
	"动作 1A",
	"动作 2A",
	"动作 3A",
	"动作 4A",
	"姿态二",
	"动作 1B",
	"动作 2B",
	"动作 3B",
	"动作 4B",
	"姿态三",
	"动作 1C",
	"动作 2C",
	"动作 3C",
	"动作 4C",
	"汗颜",
	"泪眼",
	"阴沉",
	"疑问",
	"生气",
	"挑眉",
	"姿态一 → 姿态二",
	"姿态一 → 姿态三",
	"姿态二 → 姿态一",
	"姿态二 → 姿态三",
	"姿态三 → 姿态一",
	"姿态三 → 姿态二",
] as const;

/**
 * 动作分组。
 * `pose` 这三个下标在 Action 组里指向的其实就是 Pose1/2/3 组的同一批文件
 * （Action[0]=*_pose1_idle、Action[5]=*_pose2_idle、Action[10]=*_pose3_idle）。
 */
export const ACTION_GROUPS = {
	/** 姿态：三个常驻姿态 */
	pose: [0, 5, 10],
	/** 主动作：12 个一次性动作 */
	main: [1, 2, 3, 4, 6, 7, 8, 9, 11, 12, 13, 14],
	/** 特效动作：可开关，再点一次关闭 */
	effect: [15, 16, 17, 18, 19, 20],
	/** 姿态过渡：必须先处于 from 姿态才能播 */
	transition: [21, 22, 23, 24, 25, 26],
} as const;

/** 姿态下标的可读说明（原始程序里只叫姿态一/二/三） */
export const POSE_DESC: Record<number, string> = {
	0: "撩头发",
	1: "手搭手",
	2: "抱臂思考",
};

/** 姿态下标 → 姿态组名。切姿态时必须同时把 motionManager.groups.idle 改成这个组。 */
export const POSE_GROUPS: Record<number, string> = {
	0: "Pose1",
	1: "Pose2",
	2: "Pose3",
};

/** 姿态过渡动作的 from/to 约束 */
export const TRANSITIONS: Record<number, { from: number; to: number }> = {
	21: { from: 0, to: 1 },
	22: { from: 0, to: 2 },
	23: { from: 1, to: 0 },
	24: { from: 1, to: 2 },
	25: { from: 2, to: 0 },
	26: { from: 2, to: 1 },
};

/**
 * 特效动作驱动的参数全集 —— 关闭特效时要把这些全部清零。
 *
 * ★ 这是两个角色的并集，不是照抄原始程序。
 * 原始程序里两个角色用的是同一个列表（SWEAT/EYE_URU/YAMI/___AP/___R/___L/
 * ANGER_1/ANGER_2/BROW_L_PIKU），但实测两个模型的特效动作驱动的参数并不相同：
 *   雪乃 疑问 → PARAM___R、PARAM___L      生气 → PARAM_ANGER_2
 *   结衣 疑问 → PARAM___R2、PARAM___R3    生气 → PARAM_ANGER_3_R、PARAM_ANGER_3_L
 * 也就是说原版对结衣是清不干净的（会残留在脸上）。用并集就都覆盖到了，
 * 对不存在的参数调用 setParameterValueById 是空操作，不会有害。
 */
export const EFFECT_PARAMS = [
	"PARAM_SWEAT",
	"PARAM_EYE_URU",
	"PARAM_YAMI",
	"PARAM___AP",
	"PARAM___R",
	"PARAM___L",
	"PARAM___R2",
	"PARAM___R3",
	"PARAM_ANGER_1",
	"PARAM_ANGER_2",
	"PARAM_ANGER_3_R",
	"PARAM_ANGER_3_L",
	"PARAM_BROW_L_PIKU",
] as const;

/**
 * 特效动作的「保持值」：动作放完后要把哪些参数钉在什么值上。
 *
 * 6 个特效动作的曲线末尾并不一致：
 *   · 汗颜 PARAM_SWEAT     末值 1   → 放完自然留一脸汗
 *   · 阴沉 PARAM_YAMI      末值 1   → 自然留住
 *   · 生气 PARAM_ANGER_1   末值 1   → 自然留住
 *   · 疑问 PARAM___AP      末值 1   → 自然留住
 *   · 挑眉 PARAM_BROW_L_PIKU 末值 0 → 本来就是瞬时抽动，抽完就该消失
 *   · 泪眼 PARAM_EYE_URU   末值 0   → ★ 问题所在
 *
 * 泪眼（*_uruuru）是一条 1.333 秒的闪烁曲线：PARAM_EYE_URU 每 0.17 秒
 * 在 0/1 之间跳一次，跳完回到 0。它本质是「闪一下」的动画，
 * 和按钮上「再点一次关闭」这个状态语义对不上。
 * 所以这里给它一个保持值，动作放完后把 PARAM_EYE_URU 钉在 1，变成持续的泪眼状态。
 *
 * 两个角色的参数名一致，所以这份表共用。
 */
export const EFFECT_HOLD: Record<number, Record<string, number>> = {
	15: { PARAM_SWEAT: 1 }, // 汗颜
	16: { PARAM_EYE_URU: 1 }, // 泪眼 ★ 真正需要保持的那个
	17: { PARAM_YAMI: 1 }, // 阴沉
	18: { PARAM___AP: 1 }, // 疑问（R/L 是问号的摆动，交给动作自己收尾）
	19: { PARAM_ANGER_1: 1 }, // 生气（ANGER_2 是爆出来的那一下，本来就该消失）
	20: {}, // 挑眉：纯瞬时抽动，不保持
};

/**
 * ★ 关键修复 1：参数 ID 覆盖
 *
 * 两个模型用的都是 PARAM_ANGLE_X / PARAM_EYE_BALL_X 这种「大写下划线」命名，
 * 而 pixi-live2d-display 的 Cubism4InternalModel 内部硬编码的是
 * ParamAngleX / ParamEyeBallX 这种驼峰命名。
 * 两者对不上时，updateFocus() 里的 coreModel.addParameterValueById(不存在的ID, ...)
 * 会静默失败 —— 表现就是「目光跟随鼠标完全没反应」。
 *
 * 原始 Windows 版桌面程序就是靠 Object.assign(internalModel, {...}) 覆盖这几个字段修好的。
 */
export const PARAM_OVERRIDES: Record<string, string> = {
	idParamAngleX: "PARAM_ANGLE_X",
	idParamAngleY: "PARAM_ANGLE_Y",
	idParamAngleZ: "PARAM_ANGLE_Z",
	idParamEyeBallX: "PARAM_EYE_BALL_X",
	idParamEyeBallY: "PARAM_EYE_BALL_Y",
	idParamBodyAngleX: "PARAM_BODY_ANGLE_X",
	idParamBreath: "PARAM_BREATH",
};

/** 口型参数（模拟说话） */
export const MOUTH_PARAM = "PARAM_MOUTH_OPEN_Y";

/** 动态加载 Live2D 运行时的顺序，不可变：core 必须在 cubism4 之前 */
export const RUNTIME_SCRIPTS = [
	url("/live2d/runtime/pixi.min.js"),
	url("/live2d/runtime/live2dcubismcore.min.js"),
	url("/live2d/runtime/cubism4.min.js"),
] as const;
