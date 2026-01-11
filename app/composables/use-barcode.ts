/**
 * Barcode generation utilities
 * Supports EAN-13, Code128, and custom barcodes
 */

export function useBarcode() {
  /**
   * Generate a valid EAN-13 barcode with check digit
   * @param prefix - Optional 2-3 digit country/company prefix
   */
  function generateEAN13(prefix?: string): string {
    let code = prefix || "";

    // Fill remaining digits with random numbers (need 12 digits before check digit)
    while (code.length < 12) {
      code += Math.floor(Math.random() * 10).toString();
    }

    // Ensure exactly 12 digits
    code = code.slice(0, 12);

    // Calculate check digit using EAN-13 algorithm
    const checkDigit = calculateEAN13CheckDigit(code);

    return code + checkDigit;
  }

  /**
   * Calculate EAN-13 check digit
   */
  function calculateEAN13CheckDigit(code: string): string {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(code[i], 10);
      sum += i % 2 === 0 ? digit : digit * 3;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit.toString();
  }

  /**
   * Generate a Code128 compatible barcode
   * @param prefix - Optional prefix (e.g., store code)
   * @param length - Total length (default: 10)
   */
  function generateCode128(prefix?: string, length = 10): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Avoid confusing chars
    let code = prefix || "";

    while (code.length < length) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }

    return code.slice(0, length).toUpperCase();
  }

  /**
   * Generate a simple numeric barcode
   * @param length - Total length (default: 8)
   */
  function generateNumeric(length = 8): string {
    let code = "";
    for (let i = 0; i < length; i++) {
      code += Math.floor(Math.random() * 10).toString();
    }
    return code;
  }

  /**
   * Validate an EAN-13 barcode
   */
  function validateEAN13(barcode: string): boolean {
    if (!/^\d{13}$/.test(barcode)) return false;

    const code = barcode.slice(0, 12);
    const expectedCheck = calculateEAN13CheckDigit(code);

    return barcode[12] === expectedCheck;
  }

  /**
   * Generate barcode based on type
   */
  function generateBarcode(
    type: "ean13" | "code128" | "numeric" = "ean13",
    options?: { prefix?: string; length?: number }
  ): string {
    switch (type) {
      case "ean13":
        return generateEAN13(options?.prefix);
      case "code128":
        return generateCode128(options?.prefix, options?.length || 10);
      case "numeric":
        return generateNumeric(options?.length || 8);
      default:
        return generateEAN13();
    }
  }

  return {
    generateEAN13,
    generateCode128,
    generateNumeric,
    generateBarcode,
    validateEAN13,
    calculateEAN13CheckDigit,
  };
}
