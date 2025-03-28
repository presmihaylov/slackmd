export enum LogLevel {
	NONE = 0,
	ERROR = 1,
	WARN = 2,
	INFO = 3,
	DEBUG = 4,
	TRACE = 5,
	OFF = 999 // Maximum level, not meant to be used directly
}

/**
 * Logger class for handling logging with different levels
 */
export class Logger {
	constructor(private level: LogLevel = LogLevel.ERROR) {}

	error(message: string, ...args: any[]): void {
		if (this.level >= LogLevel.ERROR) {
			console.error(`[ERROR] ${message}`, ...args);
		}
	}

	warn(message: string, ...args: any[]): void {
		if (this.level >= LogLevel.WARN) {
			console.warn(`[WARN] ${message}`, ...args);
		}
	}

	info(message: string, ...args: any[]): void {
		if (this.level >= LogLevel.INFO) {
			console.info(`[INFO] ${message}`, ...args);
		}
	}

	debug(message: string, ...args: any[]): void {
		if (this.level >= LogLevel.DEBUG) {
			console.log(`[DEBUG] ${message}`, ...args);
		}
	}

	trace(message: string, ...args: any[]): void {
		if (this.level >= LogLevel.TRACE) {
			console.log(`[TRACE] ${message}`, ...args);
		}
	}
}