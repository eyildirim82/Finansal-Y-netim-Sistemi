"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logError = exports.sanitizeError = void 0;
const pino_1 = __importDefault(require("pino"));
const isProduction = process.env.NODE_ENV === 'production';
const destination = isProduction
    ? pino_1.default.destination({ dest: process.env.LOG_FILE || './logs/app.log', mkdir: true })
    : pino_1.default.destination(1);
const logger = (0, pino_1.default)({
    level: process.env.LOG_LEVEL || 'info'
}, destination);
const sanitizeError = (err) => {
    if (err instanceof Error) {
        return { message: err.message };
    }
    return { message: String(err) };
};
exports.sanitizeError = sanitizeError;
const logError = (message, error, context = {}) => {
    logger.error({ err: (0, exports.sanitizeError)(error), ...context }, message);
};
exports.logError = logError;
const originalConsoleError = console.error.bind(console);
console.error = (msg, ...args) => {
    const err = args.length ? args[args.length - 1] : msg;
    const ctx = args.length > 1 ? { args: args.slice(0, -1) } : {};
    (0, exports.logError)(String(msg), err, ctx);
    if (!isProduction) {
        originalConsoleError(msg, ...args);
    }
};
exports.default = logger;
//# sourceMappingURL=logger.js.map