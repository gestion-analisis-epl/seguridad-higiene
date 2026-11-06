import type { ReactNode } from 'react'
import { PestanasAdmin } from '@/presentation/navegacion/PestanasAdmin'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PestanasAdmin />
      {children}
    </>
  )
}
