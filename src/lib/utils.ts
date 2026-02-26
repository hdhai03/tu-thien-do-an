import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

export function formatCompactNumber(number: number) {
  if (number >= 1e9) {
    return (number / 1e9).toFixed(1).replace(/\.0$/, '') + ' Tỷ';
  }
  if (number >= 1e6) {
    return (number / 1e6).toFixed(1).replace(/\.0$/, '') + ' Triệu';
  }
  if (number >= 1e3) {
    return (number / 1e3).toFixed(1).replace(/\.0$/, '') + ' Nghìn';
  }
  return number.toString();
}
