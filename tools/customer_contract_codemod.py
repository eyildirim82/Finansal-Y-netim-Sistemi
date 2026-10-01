from pathlib import Path


def replace(path: str, old: str, new: str, expected: int = 1) -> None:
    target = Path(path)
    text = target.read_text()
    count = text.count(old)
    if count != expected:
        raise SystemExit(f"{path}: expected {expected} matches, found {count}: {old[:120]!r}")
    target.write_text(text.replace(old, new))


service = "backend/src/modules/customers/service.ts"
replace(
    service,
    "import { moneyToNumber } from '../../shared/prismaDecimalJson';\n",
    "import { moneyToNumber } from '../../shared/prismaDecimalJson';\nimport { CreateCustomerDto, UpdateCustomerDto } from './dto';\nimport { randomUUID } from 'crypto';\n",
)
replace(
    service,
    "    userId?: string\n  ): Promise<ApiResponse<PaginatedResponse<Customer>>> {",
    "    userId: string\n  ): Promise<ApiResponse<PaginatedResponse<Customer>>> {",
)
replace(
    service,
    "      const whereClause: any = userId ? { userId } : {};",
    "      const whereClause: any = { userId };",
    expected=2,
)
replace(
    service,
    """  async getCustomerById(id: string): Promise<ApiResponse<Customer>> {
    return this.safeDatabaseOperation(async () => {
      const customer = await this.prisma.customer.findUnique({
        where: { id },
        include: {
          transactions: {
            include: {
              category: true
            },
            orderBy: { date: 'desc' }
          },
          balance: true
        }
      });

      if (!customer) {
        throw new Error('Müşteri bulunamadı');
      }

      return customer;
    }, 'Müşteri getirilemedi');
  }""",
    """  async getCustomerById(id: string, userId: string): Promise<ApiResponse<Customer>> {
    return this.safeDatabaseOperation(async () => {
      const customer = await this.prisma.customer.findFirst({
        where: { id, userId },
        include: {
          transactions: {
            include: {
              category: true
            },
            orderBy: { date: 'desc' }
          },
          balance: true
        }
      });

      if (!customer) {
        throw new Error('Müşteri bulunamadı');
      }

      return customer;
    }, 'Müşteri getirilemedi');
  }""",
)
replace(
    service,
    """  async createCustomer(data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Customer>> {
    return this.safeDatabaseOperation(async () => {
      return await this.prisma.customer.create({
        data: {
          ...data,
          dueDays: data.dueDays || 0
        }
      });
    }, 'Müşteri oluşturulamadı');
  }""",
    """  async createCustomer(data: CreateCustomerDto, userId: string): Promise<ApiResponse<Customer>> {
    return this.safeDatabaseOperation(async () => {
      return await this.prisma.customer.create({
        data: {
          ...data,
          code: `CUST_${randomUUID()}`,
          userId,
          type: data.type ?? 'INDIVIDUAL',
          dueDays: data.dueDays ?? 0,
          isActive: data.isActive ?? true
        }
      });
    }, 'Müşteri oluşturulamadı');
  }""",
)
replace(
    service,
    """  async updateCustomer(id: string, data: Partial<Customer>): Promise<ApiResponse<Customer>> {
    return this.safeDatabaseOperation(async () => {
      const customer = await this.prisma.customer.findUnique({ where: { id } });
      if (!customer) {
        throw new Error('Müşteri bulunamadı');
      }

      return await this.prisma.customer.update({
        where: { id },
        data
      });
    }, 'Müşteri güncellenemedi');
  }""",
    """  async updateCustomer(id: string, data: UpdateCustomerDto, userId: string): Promise<ApiResponse<Customer>> {
    return this.safeDatabaseOperation(async () => {
      const updated = await this.prisma.customer.updateMany({
        where: { id, userId },
        data
      });

      if (updated.count === 0) {
        throw new Error('Müşteri bulunamadı');
      }

      const customer = await this.prisma.customer.findFirst({
        where: { id, userId }
      });

      if (!customer) {
        throw new Error('Müşteri bulunamadı');
      }

      return customer;
    }, 'Müşteri güncellenemedi');
  }""",
)
replace(
    service,
    """  async deleteCustomer(id: string): Promise<ApiResponse<boolean>> {
    return this.safeDatabaseOperation(async () => {
      const customer = await this.prisma.customer.findUnique({ where: { id } });
      if (!customer) {
        throw new Error('Müşteri bulunamadı');
      }

      // İlişkili işlemleri kontrol et
      const transactionCount = await this.prisma.transaction.count({
        where: { customerId: id }
      });

      if (transactionCount > 0) {
        throw new Error('Bu müşteriye ait işlemler bulunduğu için silinemez');
      }

      await this.prisma.customer.delete({ where: { id } });
      return true;
    }, 'Müşteri silinemedi');
  }""",
    """  async deleteCustomer(id: string, userId: string): Promise<ApiResponse<boolean>> {
    return this.safeDatabaseOperation(async () => {
      const customer = await this.prisma.customer.findFirst({ where: { id, userId } });
      if (!customer) {
        throw new Error('Müşteri bulunamadı');
      }

      // İlişkili işlemleri kontrol et
      const transactionCount = await this.prisma.transaction.count({
        where: { customerId: id }
      });

      if (transactionCount > 0) {
        throw new Error('Bu müşteriye ait işlemler bulunduğu için silinemez');
      }

      const deleted = await this.prisma.customer.deleteMany({ where: { id, userId } });
      if (deleted.count === 0) {
        throw new Error('Müşteri bulunamadı');
      }

      return true;
    }, 'Müşteri silinemedi');
  }""",
)
replace(
    service,
    "  async searchCustomers(query: string, params: PaginationParams): Promise<ApiResponse<PaginatedResponse<Customer>>> {",
    "  async searchCustomers(query: string, params: PaginationParams, userId: string): Promise<ApiResponse<PaginatedResponse<Customer>>> {",
)
replace(
    service,
    """          where: {
            OR: [
              { name: { contains: query } },
              { phone: { contains: query } },
              { address: { contains: query } }
            ]
          },""",
    """          where: {
            userId,
            OR: [
              { name: { contains: query } },
              { phone: { contains: query } },
              { address: { contains: query } }
            ]
          },""",
    expected=1,
)
replace(
    service,
    """          where: {
            OR: [
              { name: { contains: query } },
              { phone: { contains: query } },
              { address: { contains: query } }
            ]
          }
        })""",
    """          where: {
            userId,
            OR: [
              { name: { contains: query } },
              { phone: { contains: query } },
              { address: { contains: query } }
            ]
          }
        })""",
)
replace(
    service,
    "  async getOverdueCustomers(): Promise<ApiResponse<Customer[]>> {",
    "  async getOverdueCustomers(userId: string): Promise<ApiResponse<Customer[]>> {",
)
replace(
    service,
    """        where: {
          extractTransactions: {""",
    """        where: {
          userId,
          extractTransactions: {""",
)
replace(
    service,
    "    userId?: string\n  ): Promise<ApiResponse<{",
    "    userId: string\n  ): Promise<ApiResponse<{",
)
replace(
    service,
    "  async deleteAllCustomers(userId?: string): Promise<ApiResponse<{ deletedCount: number }>> {",
    "  async deleteAllCustomers(userId: string): Promise<ApiResponse<{ deletedCount: number }>> {",
)
replace(
    service,
    "      const whereClause: any = userId ? { userId } : {};",
    "      const whereClause: any = { userId };",
)

controller = "backend/src/modules/customers/controller.ts"
replace(
    controller,
    "import { validate, customerValidations } from '../../shared/middleware/validation';\n",
    "import { validate, createCustomerValidations, updateCustomerValidations } from '../../shared/middleware/validation';\nimport { toCreateCustomerDto, toUpdateCustomerDto } from './dto';\n",
)
replace(
    controller,
    """  constructor() {
    this.customerService = new CustomerService();
  }
""",
    """  constructor() {
    this.customerService = new CustomerService();
  }

  private requireUserId(req: Request, res: Response): string | null {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Kimlik doğrulaması gerekli'
      });
      return null;
    }
    return userId;
  }
""",
)
replace(
    controller,
    """      // Kullanıcı ID'sini request'ten al
      const userId = req.user?.id;

      const result = await this.customerService.getCustomers(params, userId);""",
    """      const userId = this.requireUserId(req, res);
      if (!userId) return;

      const result = await this.customerService.getCustomers(params, userId);""",
)
replace(
    controller,
    """      const { id } = req.params;
      const result = await this.customerService.getCustomerById(id);""",
    """      const userId = this.requireUserId(req, res);
      if (!userId) return;
      const { id } = req.params;
      const result = await this.customerService.getCustomerById(id, userId);""",
)
replace(controller, "    validate(customerValidations),", "    validate(createCustomerValidations),", expected=1)
replace(
    controller,
    """      try {
        const result = await this.customerService.createCustomer(req.body);""",
    """      try {
        const userId = this.requireUserId(req, res);
        if (!userId) return;
        const data = toCreateCustomerDto(req.body);
        const result = await this.customerService.createCustomer(data, userId);""",
)
replace(controller, "    validate(customerValidations),", "    validate(updateCustomerValidations),", expected=1)
replace(
    controller,
    """      try {
        const { id } = req.params;
        const result = await this.customerService.updateCustomer(id, req.body);""",
    """      try {
        const userId = this.requireUserId(req, res);
        if (!userId) return;
        const { id } = req.params;
        const data = toUpdateCustomerDto(req.body);
        const result = await this.customerService.updateCustomer(id, data, userId);""",
)
replace(
    controller,
    """      const { id } = req.params;
      const result = await this.customerService.deleteCustomer(id);""",
    """      const userId = this.requireUserId(req, res);
      if (!userId) return;
      const { id } = req.params;
      const result = await this.customerService.deleteCustomer(id, userId);""",
)
replace(
    controller,
    """      const result = await this.customerService.searchCustomers(q as string, params);""",
    """      const userId = this.requireUserId(req, res);
      if (!userId) return;
      const result = await this.customerService.searchCustomers(q as string, params, userId);""",
)
replace(
    controller,
    """    try {
      const result = await this.customerService.getOverdueCustomers();""",
    """    try {
      const userId = this.requireUserId(req, res);
      if (!userId) return;
      const result = await this.customerService.getOverdueCustomers(userId);""",
)
replace(
    controller,
    """      // Kullanıcı ID'sini request'ten al
      const userId = req.user?.id;
      console.log('📊 getCustomerStats - UserId:', userId);

      const result = await this.customerService.getCustomerStats(filters, userId);""",
    """      const userId = this.requireUserId(req, res);
      if (!userId) return;
      console.log('📊 getCustomerStats - UserId:', userId);

      const result = await this.customerService.getCustomerStats(filters, userId);""",
)
replace(
    controller,
    """      // Kullanıcı ID'sini request'ten al
      const userId = req.user?.id;
      console.log('🗑️ deleteAllCustomers - UserId:', userId);

      const result = await this.customerService.deleteAllCustomers(userId);""",
    """      const userId = this.requireUserId(req, res);
      if (!userId) return;
      console.log('🗑️ deleteAllCustomers - UserId:', userId);

      const result = await this.customerService.deleteAllCustomers(userId);""",
)
