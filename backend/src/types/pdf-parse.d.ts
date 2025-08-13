declare module 'pdf-parse' {
  interface PDFData {
    text: string;
    numpages: number;
    info: any;
  }
  
  function pdf(dataBuffer: Buffer): Promise<PDFData>;
  export = pdf;
}
