export function validateWebsiteUrl(value) {
  if (!value.trim()) return 'Enter a website URL.'
  if (value.length > 2048) return 'The URL must be 2,048 characters or fewer.'

  try {
    const url = new URL(value.trim())
    if (!['http:', 'https:'].includes(url.protocol)) {
      return 'Use a website address that begins with http:// or https://.'
    }
    if (!url.hostname || !url.hostname.includes('.')) {
      return 'Enter a complete website address, such as https://example.com.'
    }
    if (url.username || url.password) {
      return 'Website URLs must not contain a username or password.'
    }
    return ''
  } catch {
    return 'Enter a valid website address, such as https://example.com.'
  }
}
