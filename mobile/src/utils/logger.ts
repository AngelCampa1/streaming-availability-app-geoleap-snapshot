export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  log(message: string, ...args: any[]): void;
  trace(message: string, ...args: any[]): void;
}

class LoggerImpl implements Logger {
  private level: LogLevel = LogLevel.INFO;

  constructor(level: LogLevel = LogLevel.INFO) {
    this.level = level;
  }

  debug(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.INFO) {
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }

  log(message: string, ...args: any[]): void {
    console.log(`[LOG] ${message}`, ...args);
  }

  trace(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.trace(`[TRACE] ${message}`, ...args);
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }

  createLogger(context: string): Logger {
    return {
      debug: (message: string, ...args: any[]) => this.debug(`[${context}] ${message}`, ...args),
      info: (message: string, ...args: any[]) => this.info(`[${context}] ${message}`, ...args),
      warn: (message: string, ...args: any[]) => this.warn(`[${context}] ${message}`, ...args),
      error: (message: string, ...args: any[]) => this.error(`[${context}] ${message}`, ...args),
      log: (message: string, ...args: any[]) => this.log(`[${context}] ${message}`, ...args),
      trace: (message: string, ...args: any[]) => this.trace(`[${context}] ${message}`, ...args),
    };
  }
}

export const logger = new LoggerImpl();

// Convenience exports for common usage patterns
export const logInfo = (message: string, ...args: any[]) => logger.info(message, ...args);
export const logError = (message: string, ...args: any[]) => logger.error(message, ...args);
export const logWarn = (message: string, ...args: any[]) => logger.warn(message, ...args);
export const logDebug = (message: string, ...args: any[]) => logger.debug(message, ...args);

export default logger;
