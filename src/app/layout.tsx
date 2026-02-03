import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { LangProvider } from '@/components/LangProvider'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'SnapLink - 阅后即焚链接分享',
  description: '私密链接分享平台，生成一次性链接，支持查看次数与时间限制，到期自动销毁。',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans min-h-screen`}>
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  )
}
