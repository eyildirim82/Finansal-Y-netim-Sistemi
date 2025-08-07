import { Request, Response } from 'express';
export declare const loginValidation: import("express-validator").ValidationChain[];
export declare const registerValidation: import("express-validator").ValidationChain[];
export declare const login: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const register: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getProfile: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const changePassword: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=controller.d.ts.map