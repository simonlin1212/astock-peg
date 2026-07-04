import type { NextConfig } from "next";

// 密钥(ANTHROPIC_API_KEY / OPENAI_API_KEY / *_BASE_URL / *_MODEL)不放进 nextConfig.env:
// 放进去会在构建期把值内联到任何引用它的产物,一旦被客户端组件引用就会泄露到浏览器。
// 这些值只在服务端用(src/lib/analysis.ts + API 路由),Next 会自动把 .env 读进服务端
// process.env,无需在此声明,也不该声明。
const nextConfig: NextConfig = {};

export default nextConfig;
