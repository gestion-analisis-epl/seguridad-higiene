import type { ReactNode } from 'react'
import { RequireAcceso } from '@/presentation/auth/RequireAcceso'
import { AppShell } from '@/presentation/navegacion/AppShell'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAcceso accion="leer">
      <AppShell>{children}</AppShell>
    </RequireAcceso>
  )
}
