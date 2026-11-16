import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

export function getApiError(error) {
  const status = error.response?.status
  const message = error.response?.data?.message
    || error.response?.data?.reason

  if (status === 429) return 'Too many requests. Please wait a little before trying again.'
  if (status === 401) return 'Admin access was not authorized. Check your admin key.'
  if (status === 403) return 'You do not have permission to perform this action.'
  if (status === 404) return message || 'The requested item was not found.'
  if (status === 409) return message || 'A similar report was recently submitted.'
  if (status === 422) {
    return error.response?.data?.reason
      || message
      || 'The website could not be reached or scanned.'
  }
  if (status === 503) return message || 'A required service is currently unavailable.'
  if (status >= 500) return message || 'The server encountered an error. Please try again later.'
  if (!error.response) return 'Could not connect to ShopShield. Check that the backend is running.'
  return message || 'Please review your information and try again.'
}

export default api
