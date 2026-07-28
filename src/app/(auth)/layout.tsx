import { LangProvider } from '@/lib/i18n'
import { AuthLangToggle } from '@/components/layout/auth-lang-toggle'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <LangProvider>
      <AuthLangToggle />
      {children}
    </LangProvider>
  )
}
