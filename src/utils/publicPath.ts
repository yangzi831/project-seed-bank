const baseUrl = import.meta.env.BASE_URL || '/'

export function publicPath(path: string) {
  if (!path.startsWith('/')) return path
  if (baseUrl === '/') return path
  return `${baseUrl.replace(/\/$/, '')}${path}`
}
