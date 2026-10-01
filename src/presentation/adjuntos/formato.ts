export function tamanoLegible(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function etiquetaTipo(mime: string): string {
  if (mime === 'application/pdf') return 'PDF'
  if (mime.startsWith('image/')) return 'Imagen'
  if (mime.includes('word')) return 'Word'
  if (mime.includes('excel') || mime.includes('spreadsheet')) return 'Excel'
  return 'Archivo'
}
