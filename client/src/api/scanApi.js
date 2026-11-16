import api from './axiosInstance'

export async function scanWebsite(url) {
  const { data } = await api.post('/scan', { url })
  return data
}

export async function getApiHealth() {
  const { data } = await api.get('/health')
  return data
}
