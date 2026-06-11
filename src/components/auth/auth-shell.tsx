import Image from 'next/image'

interface AuthShellProps {
  /** Heading shown above the form card (right panel) */
  heading: string
  /** Subtitle under the heading */
  subheading: string
  /** The form / content card */
  children: React.ReactNode
  /** Large title on the brand panel (left), line 1 */
  brandTitle?: string
  /** Large title on the brand panel (left), line 2 (accent color) */
  brandTitleAccent?: string
  /** Paragraph under the brand title */
  brandText?: string
}

export function AuthShell({
  heading,
  subheading,
  children,
  brandTitle = 'منصة الإدارة',
  brandTitleAccent = 'الداخلية',
  brandText = 'نظام متكامل لإدارة دورة حياة المشاريع — من التعاقد حتى التسليم النهائي',
}: AuthShellProps) {
  return (
    <div className="flex min-h-screen">
      {/* === Form Panel (Right in RTL — shown first) === */}
      <div className="flex flex-1 flex-col items-center justify-center bg-gray-50 p-6 lg:p-16">
        {/* Mobile logo */}
        <div className="mb-10 lg:hidden">
          <div className="bg-white rounded-2xl px-6 py-4 shadow-md border border-gray-100">
            <Image src="/logo.png" alt="سمنان" width={180} height={65} className="object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          </div>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8 text-end">
            <h1 className="text-3xl font-bold text-gray-900">{heading}</h1>
            <p className="mt-1.5 text-gray-500">{subheading}</p>
          </div>

          {children}
        </div>

        <p className="mt-12 text-center text-xs text-gray-400">
          تصميم وتطوير بواسطة{' '}
          <a href="https://tfco.sa/" target="_blank" rel="noreferrer" className="font-medium text-gray-500 hover:text-gray-700 transition-colors">Thakaa Flow</a>
        </p>
      </div>

      {/* === Brand Panel (Left in RTL — shown second) === */}
      <div className="hidden lg:flex lg:w-[45%] flex-col items-center justify-between bg-brand-700 p-12 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-brand-600/40 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-brand-800/60 blur-2xl" />
          <div className="absolute top-1/2 right-1/2 h-56 w-56 rounded-full bg-white/5 blur-2xl" />
          <svg className="absolute inset-0 h-full w-full opacity-5" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="hexgrid" width="60" height="52" patternUnits="userSpaceOnUse">
                <polygon points="30,2 58,17 58,47 30,62 2,47 2,17" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hexgrid)" />
          </svg>
        </div>

        {/* Top: Main logo */}
        <div className="relative z-10 w-full">
          <div className="flex justify-center">
            <div className="bg-white rounded-2xl px-8 py-5 shadow-2xl">
              <Image src="/logo.png" alt="مجموعة سمنان القابضة" width={220} height={80}
                className="object-contain" priority
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            </div>
          </div>
        </div>

        {/* Center: Title */}
        <div className="relative z-10 text-center">
          <div className="mb-8">
            <h2 className="text-4xl font-bold text-white leading-tight">{brandTitle}</h2>
            <h2 className="text-4xl font-bold text-brand-300 leading-tight">{brandTitleAccent}</h2>
          </div>
          <p className="text-brand-200 text-base leading-relaxed max-w-xs mx-auto">
            {brandText}
          </p>
        </div>

        {/* Bottom: subsidiary logos strip */}
        <div className="relative z-10 w-full">
          <div className="border-t border-white/10 pt-6">
            <Image src="/logo2.jpg" alt="مجموعات سمنان" width={340} height={60}
              className="object-contain opacity-70 mx-auto rounded-lg"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          </div>
        </div>
      </div>
    </div>
  )
}
