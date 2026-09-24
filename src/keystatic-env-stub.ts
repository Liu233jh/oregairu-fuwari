/**
 * `astro:env/server` 的本地替身。
 *
 * 为什么需要它：
 *   `@keystatic/astro` 的服务端模块（dist/keystatic-astro-api.js）在**顶层**就
 *   `import { getSecret } from "astro:env/server"`，即使我们用 storage: local 也用不到它。
 *   开发运行时这个虚拟模块由 Astro 的 astro-env-plugin（enforce: "pre"）提供，一切正常；
 *   但 Vite 的 esbuild 依赖预打包不执行 Vite 插件，esbuild 会退化成把 `astro:env/server`
 *   当普通包名，去 node_modules 里找名为 `astro:env` 的目录。Windows 上冒号是非法路径
 *   字符，于是整个依赖预打包失败（Cannot read directory "node_modules/astro:env"），
 *   前端 island 永远等不到模块 —— Keystatic 后台就是一片空白。
 *
 * 为什么这样替代是安全的：
 *   本项目 storage 用 local 模式，没有配置 env schema，因此 Keystatic 只会去读
 *   config 里显式传入的值，getSecret 永远走不到；返回 undefined 与真实行为等价。
 *   而且 Astro 的 env 插件是 pre 级，优先于 Vite 的 alias，所以真实运行时
 *   仍然使用 Astro 的官方虚拟模块，这个替身只服务于依赖预打包。
 */
export const getSecret = (_key: string): string | undefined => undefined;

export default { getSecret };
