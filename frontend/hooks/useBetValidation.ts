export function useBetValidation(amountStr: string, balance: number) {
  const amount = parseFloat(amountStr || "0");
  const warnings: string[] = [];
  let error: string | null = null;
  let isValid = true;

  if (isNaN(amount) || amount <= 0) {
    error = "Enter a valid amount";
    isValid = false;
  }

  if (amount > balance) {
    error = "Insufficient balance";
    isValid = false;
  }

  if (amount < 0.01) {
    warnings.push("Minimum bet is 0.01 USDC");
  }

  return { amount, isValid, error, warnings };
}
