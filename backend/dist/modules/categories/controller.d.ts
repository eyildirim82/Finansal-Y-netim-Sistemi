import { Request, Response } from 'express';
export declare class CategoryController {
    static getAllCategories(req: Request, res: Response): Promise<void>;
    static getCategory(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static createCategory(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static updateCategory(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static deleteCategory(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getCategoryStats(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static searchCategories(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=controller.d.ts.map