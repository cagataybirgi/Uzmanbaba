import { config } from "./config.js";

/**
 * Tiny structured logger. Avoids a heavy dep — for production-grade logging
 * swap in pino or winston later. The shape (level + message + meta) is what
 * matters so we can change the implementation without touching call sites.
 */
type Level = "debug" | "info" | "warn" | "error";

const LEVEL_RANK: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const minRank = LEVEL_RANK[config.isDev ? "debug" : "info"];

function emit(level: Level, message: string, meta?: Record<string, unknown>) {
  if (LEVEL_RANK[level] < minRank) return;
  const line = {
    t: new Date().toISOString(),
    level,
    msg: message,
    ...(meta ?? {}),
  };
  const out = level === "error" || level === "warn" ? console.error : console.log;
  out(JSON.stringify(line));
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => emit("debug", msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => emit("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => emit("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => emit("error", msg, meta),
};
