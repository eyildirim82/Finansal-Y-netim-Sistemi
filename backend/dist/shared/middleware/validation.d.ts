import { Request, Response, NextFunction } from 'express';
import { ValidationChain } from 'express-validator';
export declare const validate: (validations: ValidationChain[]) => (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare const commonValidations: {
    id: ValidationChain;
    page: ValidationChain;
    limit: ValidationChain;
    amount: ValidationChain;
    description: ValidationChain;
    email: ValidationChain;
    phone: ValidationChain;
    date: ValidationChain;
    boolean: ValidationChain;
    enum: (field: string, values: string[]) => ValidationChain;
};
export declare const customerValidations: ValidationChain[];
export declare const transactionValidations: ValidationChain[];
export declare const categoryValidations: ValidationChain[];
export declare const bankTransactionValidations: ValidationChain[];
//# sourceMappingURL=validation.d.ts.map