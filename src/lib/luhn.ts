/** Suma kontrolna Luhna dla numerów kart. */
export function luhnCheckDigit(digits: string): number {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 0) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return (10 - (sum % 10)) % 10;
}

export function isValidLuhn(number: string): boolean {
  if (!/^\d{2,}$/.test(number)) return false;
  return luhnCheckDigit(number.slice(0, -1)) === Number(number.at(-1));
}

/** Format do wyświetlania: 2900 1234 5678 9012 */
export const formatCardNumber = (n: string) => n.replace(/(\d{4})(?=\d)/g, "$1 ");
export const normalizeCardNumber = (n: string) => n.replace(/[\s-]/g, "");
