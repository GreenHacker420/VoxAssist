import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/)
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`
  }
  return phone
}

export function getSentimentColor(sentiment: string): string {
  switch (sentiment.toLowerCase()) {
    case 'positive':
      return 'text-success-600 bg-success-50'
    case 'negative':
      return 'text-danger-600 bg-danger-50'
    case 'neutral':
    default:
      return 'text-gray-600 bg-gray-50'
  }
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'resolved':
      return 'text-success-600 bg-success-50'
    case 'in-progress':
    case 'active':
      return 'text-primary-600 bg-primary-50'
    case 'escalated':
    case 'failed':
      return 'text-danger-600 bg-danger-50'
    case 'pending':
    case 'waiting':
      return 'text-warning-600 bg-warning-50'
    default:
      return 'text-gray-600 bg-gray-50'
  }
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}
