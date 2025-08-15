import { Request, Response } from 'express';
export declare class CustomerController {
    private customerService;
    constructor();
    getCustomers: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    getCustomerById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    createCustomer: ((req: Request, res: Response, next: import("express").NextFunction) => Promise<void | Response<any, Record<string, any>>>)[];
    updateCustomer: ((req: Request, res: Response, next: import("express").NextFunction) => Promise<void | Response<any, Record<string, any>>>)[];
    deleteCustomer: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    searchCustomers: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    getOverdueCustomers: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    getCustomerStats: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    deleteAllCustomers: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=controller.d.ts.map