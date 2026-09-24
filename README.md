# 春物语录 · GitHub Pages 部署版

《我的青春恋爱物语果然有问题》主题站 —— **给朋友看的公网版本**。
本地自用版另有其一（那份带 Keystatic 写作后台，跑在本地 Node 上）。

## 线上地址

**https://liu233jh.github.io/oregairu-fuwari/**

## 这里面有什么

| 板块 | 内容 |
|---|---|
| 首页 | 全屏 4K 壁纸开屏（打字机标语 + 日语金句轮播 + 樱花飘落）+ 通栏全员群像 |
| 语录库 | 450 条语录（177 条精选），可按角色 / 主题筛选，也能关键词搜索 |
| 角色页 | 3 个角色接入 Live2D：雪之下雪乃 / 由比滨结衣 / 一色彩羽；可换装、切姿态、14 个表情、27 个动作 |
| 博客 | 14 篇春物导读、逐季编年与角色分析 |
| 搜索 | 两路合并：语录（客户端）+ 文章（Pagefind） |
| 其它 | 深色/浅色主题、Swup 软导航、响应式 |

## 与本地版的差异

这是**独立的部署副本**，本地那份完全没动。为适配纯静态托管做了这些改动：

| 改动 | 原因 |
|---|---|
| `astro.config.mjs` 设 `site` + `base = /oregairu-fuwari/` | GitHub Pages 项目页在子路径下，且 RSS/sitemap 需要正确的绝对 URL |
| 摘掉导航栏的「写作」链接 | Keystatic 是 `prerender: false` 的 SSR 路由，不在静态产物里，留着只会 404 |
| Live2D 模型路径、角色页互跳、首页角色卡、`quotes-data.json` 改走 `url()` | 这些原本写死了绝对根路径，在 `base` 下会 404 |

**写作功能不在这个版本里** —— 请用本地那份（`pnpm dev`）。

## 部署方式

推 `main` 分支 → GitHub Actions 自动构建 → 产物推到 `gh-pages` 分支 → Pages 从这里发布。
工作流见 `.github/workflows/deploy.yml`。

> 注意 `publish_dir` 是 `dist/client` 而不是 `dist` —— 项目装了 `@astrojs/node` adapter，
> 产物会分成 `dist/client`（静态）+ `dist/server`（SSR）。静态托管只需要前者。

## 技术栈

Astro 5 + [Fuwari](https://github.com/saicaca/fuwari)（MIT）· TailwindCSS + Stylus ·
PixiJS 6 + pixi-live2d-display + Live2D Cubism 4 Core · Pagefind · Swup

## 致谢

| 感谢 | 提供了什么 |
|---|---|
| [Steam 用户 76561199518678886](https://steamcommunity.com/profiles/76561199518678886/) | 首页开屏壁纸 |
| B 站 UP 主 **嘘暖liu** | 雪之下雪乃 Live2D 模型 |
| [Sjkhx/yukinoDigital](https://github.com/Sjkhx/yukinoDigital) · [B 站 @452731021](https://space.bilibili.com/452731021) | 整体思路与灵感 |
| [saicaca/fuwari](https://github.com/saicaca/fuwari) | 主题基底（MIT） |
| 伊緒直道 | 全员群像插画 |

作者：**Abyss探险者**（[2985773121@qq.com](mailto:2985773121@qq.com) · [B 站](https://space.bilibili.com/543388364)）

## 声明

- 本站为**非官方粉丝作品**，仅供个人学习研究使用
- 《我的青春恋爱物语果然有问题》版权归原作者、出版社及动画制作委员会所有
- **Live2D 模型版权归模型制作者所有**，请勿用于商业用途，请勿公开分发模型素材
