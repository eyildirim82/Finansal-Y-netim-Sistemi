import pino from 'pino';
declare const logger: pino.Logger<never, boolean>;
export declare const sanitizeError: (err: unknown) => {
    message: string;
};
export declare const logError: (message: string, error: unknown, context?: Record<string, any>) => void;
export default logger;
//# sourceMappingURL=logger.d.ts.map