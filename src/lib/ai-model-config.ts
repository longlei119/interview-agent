import { getEnvFallbackStatus, type ModelRole } from "./deepseek";

export const MODEL_ROLES: ModelRole[] = ["primary", "answer", "vision", "asr"];

export interface SafeAiModelConfig {
  id: string;
  role: ModelRole;
  name: string;
  baseUrl: string;
  model: string;
  enabled: boolean;
  isDefault: boolean;
  sortOrder: number;
  apiKeyConfigured: boolean;
  lastErrorAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export function isModelRole(value: unknown): value is ModelRole {
  return typeof value === "string" && MODEL_ROLES.includes(value as ModelRole);
}

export function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

export function validateBaseUrl(value: string): string | null {
  const baseUrl = normalizeBaseUrl(value);
  if (!baseUrl) return null;
  try {
    const url = new URL(baseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return baseUrl;
  } catch {
    return null;
  }
}

export function sanitizeAiModelConfig(row: {
  id: string;
  role: string;
  name: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  enabled: boolean;
  isDefault: boolean;
  sortOrder: number;
  lastErrorAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}): SafeAiModelConfig {
  return {
    id: row.id,
    role: row.role as ModelRole,
    name: row.name,
    baseUrl: row.baseUrl,
    model: row.model,
    enabled: row.enabled,
    isDefault: row.isDefault,
    sortOrder: row.sortOrder,
    apiKeyConfigured: Boolean(row.apiKey),
    lastErrorAt: row.lastErrorAt?.toISOString() ?? null,
    lastError: row.lastError,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function buildEnvFallbacks() {
  return getEnvFallbackStatus();
}

export function parseSortOrder(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return 0;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.floor(n);
}
