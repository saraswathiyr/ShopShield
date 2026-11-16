import api from './axiosInstance'

export async function submitReport(report) {
  const { data } = await api.post('/reports', report)
  return data
}
