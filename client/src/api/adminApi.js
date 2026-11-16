import api from './axiosInstance'

export async function getReports(status, adminKey) {
  const { data } = await api.get('/admin/reports', {
    params: { status },
    headers: { 'x-admin-key': adminKey },
  })
  return data
}

export async function reviewReport(id, status, reviewNote, adminKey) {
  const { data } = await api.patch(`/admin/reports/${id}`, {
    status,
    reviewNote,
  }, {
    headers: { 'x-admin-key': adminKey },
  })
  return data
}
