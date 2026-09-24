import type {
	ExpressiveCodeConfig,
	LicenseConfig,
	NavBarConfig,
	ProfileConfig,
	SiteConfig,
} from "./types/config";
import { LinkPreset } from "./types/config";

export const siteConfig: SiteConfig = {
	title: "春物语录",
	subtitle: "我的青春恋爱物语果然有问题",
	lang: "zh_CN", // Language code, e.g. 'en', 'zh_CN', 'ja', etc.
	themeColor: {
		// 桌宠主蓝 #62b6ff 的 OKLCH hue = 247
		hue: 247, // Default hue for the theme color, from 0 to 360. e.g. red: 0, teal: 200, cyan: 250, pink: 345
		fixed: true, // Hide the theme color picker for visitors
	},
	banner: {
		// 关掉 fuwari 自带的顶部横幅。原因：
		//   1. 它固定 65vh 高 + object-fit:cover，5.21:1 的全员群像会被裁掉中间约 44%，
		//      而这张图（by 伊緒直道）要的就是整幅展开；
		//   2. 首页现在自带「开屏大图」，再叠一层横幅就是两张巨图堆在首屏。
		// 群像改由 HomeHero 的 .wa-band 一节按原始比例完整呈现。
		enable: false,
		src: "assets/images/wide-art.webp", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
		position: "center", // Equivalent to object-position, only supports 'top', 'center', 'bottom'. 'center' by default
		credit: {
			enable: false, // Display the credit text of the banner image
			text: "", // Credit text to be displayed
			url: "", // (Optional) URL link to the original artwork or artist's page
		},
	},
	toc: {
		enable: true, // Display the table of contents on the right side of the post
		depth: 2, // Maximum heading depth to show in the table, from 1 to 3
	},
	favicon: [
		// Leave this array empty to use the default favicon
		// {
		//   src: '/favicon/icon.png',    // Path of the favicon, relative to the /public directory
		//   theme: 'light',              // (Optional) Either 'light' or 'dark', set only if you have different favicons for light and dark mode
		//   sizes: '32x32',              // (Optional) Size of the favicon, set only if you have favicons of different sizes
		// }
	],
};

export const navBarConfig: NavBarConfig = {
	links: [
		LinkPreset.Home,
		LinkPreset.Archive,
		{
			name: "语录",
			url: "/quotes/",
		},
		{
			name: "雪乃",
			url: "/character/",
		},
		{
			name: "结衣",
			url: "/yui/",
		},
		{
			name: "一色",
			url: "/iroha/",
		},
		// ⚠️ 部署版这里**没有**「写作」链接。
		// /keystatic/ 是 prerender: false 的 SSR 路由，不在静态产物里 ——
		// GitHub Pages 是纯静态托管，留着它只会点出 404。
		// 写作功能请用本地那份（pnpm dev 或 pnpm build && node dist/server/entry.mjs）。
		LinkPreset.About,
	],
};

export const profileConfig: ProfileConfig = {
	avatar: "assets/images/avatar.webp", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
	// 这个卡片是「角色人设」，保留雪乃 —— 真实作者信息在下面 links 和 /about/ 页
	name: "雪之下雪乃",
	bio: "总武高中二年级 · 奉仕部部长",
	links: [
		{
			name: "语录",
			icon: "fa6-solid:quote-left", // Visit https://icones.js.org/ for icon codes
			url: "/quotes/",
		},
		{
			name: "雪乃",
			icon: "fa6-solid:user",
			url: "/character/",
		},
		// 作者 Abyss探险者 的 B 站
		{
			name: "B站",
			icon: "fa6-brands:bilibili",
			url: "https://space.bilibili.com/543388364",
		},
	],
};

export const licenseConfig: LicenseConfig = {
	enable: true,
	name: "CC BY-NC-SA 4.0",
	url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
};

export const expressiveCodeConfig: ExpressiveCodeConfig = {
	// Note: Some styles (such as background color) are being overridden, see the astro.config.mjs file.
	// Please select a dark theme, as this blog theme currently only supports dark background color
	theme: "github-dark",
};
