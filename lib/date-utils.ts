// Safe date formatting utilities to prevent hydration mismatches

export const formatDate = (dateString: string | Date): string => {
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return 'Invalid Date'
    }
    // Use ISO date format to avoid locale differences
    return date.toISOString().split('T')[0] // YYYY-MM-DD format
  } catch {
    return 'Invalid Date'
  }
}

export const formatDateTime = (dateString: string | Date): string => {
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return 'Invalid Date'
    }
    // Use ISO format without milliseconds
    return date.toISOString().replace('T', ' ').slice(0, 19) // YYYY-MM-DD HH:mm:ss
  } catch {
    return 'Invalid Date'
  }
}

export const formatTime = (dateString: string | Date): string => {
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return 'Invalid Time'
    }
    // Use 24-hour format to avoid AM/PM locale issues
    return date.toISOString().slice(11, 19) // HH:mm:ss
  } catch {
    return 'Invalid Time'
  }
}

// Client-side only date formatting for when we need locale-specific formats
export const formatDateLocale = (dateString: string | Date): string => {
  if (typeof window === 'undefined') {
    return formatDate(dateString) // Fallback for SSR
  }
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return 'Invalid Date'
    }
    return date.toLocaleDateString()
  } catch {
    return 'Invalid Date'
  }
}

export const formatTimeLocale = (dateString: string | Date): string => {
  if (typeof window === 'undefined') {
    return formatTime(dateString) // Fallback for SSR
  }
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return 'Invalid Time'
    }
    return date.toLocaleTimeString()
  } catch {
    return 'Invalid Time'
  }
}
