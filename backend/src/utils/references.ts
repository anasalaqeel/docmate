/**
 * Generates a unique order reference number with format: ORDER-{timestamp}-{random}
 */
export function generateOrderReference(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11).toUpperCase();
  return `ORDER-${timestamp}-${random}`;
}
