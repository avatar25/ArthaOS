export const currency = (value: number, currencyCode = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(value)

export const compactCurrency = (value: number, currencyCode = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)

export const percentage = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(value)
