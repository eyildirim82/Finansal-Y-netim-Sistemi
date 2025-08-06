import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

// Configure transport based on environment
const destination = isProduction
  ? pino.destination({ dest: process.env.LOG_FILE || './logs/app.log', mkdir: true })
  : pino.destination(1); // stdout

const logger = pino({
  level: process.env.LOG_LEVEL || 'info'
}, destination);

export const sanitizeError = (err: unknown) => {
  if (err instanceof Error) {
    return { message: err.message };
  }
  return { message: String(err) };
};

export const logError = (
  message: string,
  error: unknown,
  context: Record<string, any> = {}
) => {
  logger.error({ err: sanitizeError(error), ...context }, message);
};

// Override console.error to use the logger
const originalConsoleError = console.error.bind(console);
console.error = (msg?: any, ...args: any[]) => {
  const err = args.length ? args[args.length - 1] : msg;
  const ctx = args.length > 1 ? { args: args.slice(0, -1) } : {};
  logError(String(msg), err, ctx);
  if (!isProduction) {
    originalConsoleError(msg, ...args);
  }
};

export default logger;

