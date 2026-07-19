import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { z } from "zod";

const AppConfigSchema = z.object({
  userPreferences: z.object({
    thumbnailPreview: z.boolean(),
    autoRefresh: z.boolean(),
  }),
  apiUrl: z.union([z.string(), z.array(z.string())]).optional(),
  viewerUrl: z.string().optional(),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

export const DEFAULT_CONFIG: AppConfig = {
  userPreferences: {
    thumbnailPreview: true,
    autoRefresh: true,
  },
};

export function getConfigDir(): string {
  return join(homedir(), ".config", "subs");
}

export function getConfigPath(): string {
  return join(getConfigDir(), "config.json");
}

export function getDatabasePath(): string {
  return join(getConfigDir(), "app.db");
}

export function ensureConfigDir(): string {
  const configDir = getConfigDir();
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }
  return configDir;
}

export function loadConfig(): AppConfig {
  ensureConfigDir();
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    // Create default config file
    saveConfig(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  }

  try {
    const configData = readFileSync(configPath, "utf-8");
    const rawConfig = JSON.parse(configData);

    // Validate with Zod schema
    const validatedConfig = AppConfigSchema.parse(rawConfig);
    return validatedConfig;
  } catch (err) {
    console.warn("Failed to load/validate config, using defaults:", err);
    // If validation fails, save the default config to fix the file
    saveConfig(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  }
}

export function getApiUrls(config: AppConfig): string[] {
  if (!config.apiUrl) return ["http://localhost:3000"];
  return Array.isArray(config.apiUrl) ? config.apiUrl : [config.apiUrl];
}

export function buildViewerUrl(
  config: AppConfig,
  apiBaseUrl: string,
  videoId: string
): string {
  const encoded = encodeURIComponent(videoId);
  if (!config.viewerUrl) return `${apiBaseUrl}/watch?v=${encoded}`;
  return config.viewerUrl.replaceAll("{videoId}", encoded);
}

export function saveConfig(config: AppConfig): void {
  ensureConfigDir();
  const configPath = getConfigPath();

  try {
    writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save config:", err);
  }
}
