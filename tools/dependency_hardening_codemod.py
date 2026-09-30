from pathlib import Path


def replace(path: str, old: str, new: str, expected: int = 1) -> None:
    file_path = Path(path)
    text = file_path.read_text()
    count = text.count(old)
    if count != expected:
        raise SystemExit(
            f"{path}: expected {expected} occurrences, found {count}: {old[:100]!r}"
        )
    file_path.write_text(text.replace(old, new))


controller = "backend/src/modules/imports/controller.ts"
replace(controller, "import * as XLSX from 'xlsx';", "import * as ExcelJS from 'exceljs';")
replace(
    controller,
    "export class ImportController {\n",
    """export class ImportController {
  private static normalizeExcelCellValue(value: any): any {
    if (value == null) return '';
    if (value instanceof Date) return value;
    if (typeof value !== 'object') return value;
    if ('result' in value && value.result != null) return value.result;
    if ('text' in value && value.text != null) return value.text;
    if (Array.isArray(value.richText)) {
      return value.richText.map((part: any) => part?.text ?? '').join('');
    }
    return String(value);
  }

  private static async readXlsxRows(filePath: string): Promise<any[][]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) return [];

    const rows: any[][] = [];
    worksheet.eachRow({ includeEmpty: true }, (row) => {
      const values: any[] = [];
      for (let column = 1; column <= worksheet.columnCount; column++) {
        values.push(ImportController.normalizeExcelCellValue(row.getCell(column).value));
      }
      rows.push(values);
    });
    return rows;
  }

""",
)
replace(controller, "if (!['.xlsx', '.xls'].includes(fileExtension))", "if (fileExtension !== '.xlsx')")
replace(
    controller,
    "message: 'Sadece Excel dosyaları (.xlsx, .xls) desteklenir'",
    "message: 'Sadece Excel (.xlsx) dosyaları desteklenir'",
)
replace(
    controller,
    """// Excel dosyasını oku
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });""",
    """// Excel dosyasını ExcelJS ile oku. Güvenlik nedeniyle eski binary .xls formatını desteklemiyoruz.
      const data = await ImportController.readXlsxRows(filePath);""",
)
replace(
    controller,
    "if (!['.xlsx', '.xls', '.csv'].includes(fileExtension))",
    "if (!['.xlsx', '.csv'].includes(fileExtension))",
)
replace(
    controller,
    "message: 'Sadece Excel (.xlsx, .xls) ve CSV (.csv) dosyaları desteklenir'",
    "message: 'Sadece Excel (.xlsx) ve CSV (.csv) dosyaları desteklenir'",
)
replace(controller, "if (['.xlsx', '.xls'].includes(fileExtension))", "if (fileExtension === '.xlsx')")
replace(
    controller,
    """// Excel dosyasını oku
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });""",
    """// Excel dosyasını ExcelJS ile oku.
        const rawData = await ImportController.readXlsxRows(filePath);""",
)

routes = "backend/src/modules/imports/routes.ts"
replace(
    routes,
    "const allowedExtensions = ['.xlsx', '.xls', '.csv'];",
    "const allowedExtensions = ['.xlsx', '.csv'];",
)
replace(
    routes,
    "cb(new Error('Sadece Excel (.xlsx, .xls) ve CSV (.csv) dosyaları desteklenir'), false);",
    "cb(new Error('Sadece Excel (.xlsx) ve CSV (.csv) dosyaları desteklenir'), false);",
)

extracts = "backend/src/modules/extracts/routes.ts"
replace(
    extracts,
    """const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Sadece Excel ve CSV dosyaları kabul edilir'));
    }""",
    """const fileExtension = path.extname(file.originalname).toLowerCase();
    const isXlsx = fileExtension === '.xlsx' &&
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    if (isXlsx) {
      cb(null, true);
    } else {
      cb(new Error('Sadece Excel (.xlsx) dosyaları kabul edilir'));
    }""",
)

import_page = "frontend/src/pages/Import.jsx"
replace(
    import_page,
    '<p className="text-sm text-gray-500">.xlsx, .xls</p>',
    '<p className="text-sm text-gray-500">.xlsx</p>',
)
replace(
    import_page,
    '<p className="text-sm text-gray-500">.csv, .txt</p>',
    '<p className="text-sm text-gray-500">.csv</p>',
)
replace(
    import_page,
    ": 'Excel (.xlsx, .xls) veya CSV (.csv) dosyaları desteklenir'",
    ": 'Excel (.xlsx) veya CSV (.csv) dosyaları desteklenir'",
)
replace(import_page, 'accept=".xlsx,.xls,.csv"', 'accept=".xlsx,.csv"')

extracts_page = "frontend/src/pages/Extracts.jsx"
replace(extracts_page, 'accept=".xlsx,.xls"', 'accept=".xlsx"')
