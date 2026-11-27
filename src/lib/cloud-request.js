const PAGE_SIZE = 100
const RELATED_BATCH_SIZE = 100

export async function request(api, url, options = {}) {
  const send = () =>
    fetch(url, {
      ...options,
      headers: { ...api.headers, ...(options.headers || {}) },
    })
  let response = await send()
  if (response.status === 401 && api.refresh) {
    await api.refresh()
    response = await send()
  }
  return response
}

export async function readRows(api, table, query = '') {
  const rows = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const response = await request(
      api,
      `${api.endpoint}/${table}?${query}${query ? '&' : ''}limit=${PAGE_SIZE}&offset=${offset}`,
    )
    if (!response.ok) throw Error(`${table} 读取失败 HTTP ${response.status}`)
    const page = await response.json()
    rows.push(...page)
    if (page.length < PAGE_SIZE) return rows
  }
}

export async function readRowsByIds(api, table, field, ids, query = '') {
  const rows = []
  for (let index = 0; index < ids.length; index += RELATED_BATCH_SIZE) {
    const batch = ids.slice(index, index + RELATED_BATCH_SIZE)
    rows.push(
      ...(await readRows(api, table, `${inQuery(field, batch)}${query ? `&${query}` : ''}`)),
    )
  }
  return rows
}

export function inQuery(field, ids) {
  return `${field}=in.(${ids.join(',')})`
}

export async function insertRows(api, table, rows, query = '') {
  if (!rows.length) return []
  const response = await request(api, `${api.endpoint}/${table}${query ? `?${query}` : ''}`, {
    method: 'POST',
    headers: {
      Prefer: query ? 'resolution=merge-duplicates,return=representation' : 'return=representation',
    },
    body: JSON.stringify(rows),
  })
  if (!response.ok) throw Error(`${table} 写入失败 HTTP ${response.status}`)
  return response.json()
}

export async function insertOne(api, table, row) {
  return (await insertRows(api, table, [row]))[0]
}

export async function deleteRows(api, table, query) {
  if (!query) return
  const response = await request(api, `${api.endpoint}/${table}?${query}`, { method: 'DELETE' })
  if (!response.ok) throw Error(`${table} 删除失败 HTTP ${response.status}`)
}

export async function updateRow(api, table, id, changes) {
  const response = await request(api, `${api.endpoint}/${table}?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(changes),
  })
  if (!response.ok) throw Error(`${table} 更新失败 HTTP ${response.status}`)
}
