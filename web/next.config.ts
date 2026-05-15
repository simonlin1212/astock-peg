import type { NextConfig } from "next";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function loadDotEnv(): Record<string, string> {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return {};
  const vars: Record<string, string> = {};
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const match = line.match(/^([A-Z_]+)=(.+)/);
    if (match) vars[match[1]] = match[2].trim();
  }
  return vars;
}

const dotEnv = loadDotEnv();

const nextConfig: NextConfig = {
  env: {
    ...(dotEnv.ANTHROPIC_API_KEY && { ANTHROPIC_API_KEY: dotEnv.ANTHROPIC_API_KEY }),
    ...(dotEnv.ANTHROPIC_BASE_URL && { ANTHROPIC_BASE_URL: dotEnv.ANTHROPIC_BASE_URL }),
    ...(dotEnv.ANTHROPIC_MODEL && { ANTHROPIC_MODEL: dotEnv.ANTHROPIC_MODEL }),
    ...(dotEnv.OPENAI_API_KEY && { OPENAI_API_KEY: dotEnv.OPENAI_API_KEY }),
  },
};

export default nextConfig;
