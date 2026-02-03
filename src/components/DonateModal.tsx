'use client'

import { useLang } from '@/components/LangProvider'
import { donateConfig } from '@/lib/donate-config'
import { X, Coffee, Heart } from 'lucide-react'

/** 规范化图片地址：public 下的本地文件必须以 / 开头；外链保持不变 */
function normalizeImageSrc(path: string): string {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  const trimmed = path.trim()
  if (trimmed.startsWith('/')) return trimmed
  if (trimmed.startsWith('public/')) return '/' + trimmed.slice(7)
  return '/' + trimmed
}

type Props = {
  open: boolean
  onClose: () => void
}

export function DonateModal({ open, onClose }: Props) {
  const { t } = useLang()
  const hasAny = donateConfig.afdian || donateConfig.wechatTipImage || donateConfig.alipayTipImage || donateConfig.other

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={t.donate}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-md rounded-2xl bg-surface-muted border border-border shadow-xl p-6">
        <button type="button" onClick={onClose} className="absolute top-4 right-4 text-text-muted hover:text-text transition" aria-label="关闭">
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 text-accent mb-2">
          <Heart className="w-5 h-5" />
          <h2 className="font-semibold text-lg">{t.donateTitle}</h2>
        </div>
        <p className="text-text-muted text-sm mb-6">{t.donateDesc}</p>

        {hasAny ? (
          <div className="space-y-4">
            {donateConfig.afdian && (
              <a
                href={donateConfig.afdian}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-accent text-white hover:bg-accent-hover transition"
              >
                <Coffee className="w-4 h-4" />
                {t.donateLink}
              </a>
            )}
            {(donateConfig.wechatTipImage || donateConfig.alipayTipImage) && (
              <div className="flex flex-wrap gap-6 justify-center">
                {donateConfig.wechatTipImage && (
                  <div className="text-center">
                    <p className="text-text-muted text-xs mb-2">微信赞赏</p>
                    <img
                      src={normalizeImageSrc(donateConfig.wechatTipImage)}
                      alt="微信赞赏码"
                      className="w-52 h-52 min-w-[208px] min-h-[208px] rounded-xl border border-border object-contain bg-white"
                    />
                  </div>
                )}
                {donateConfig.alipayTipImage && (
                  <div className="text-center">
                    <p className="text-text-muted text-xs mb-2">支付宝</p>
                    <img
                      src={normalizeImageSrc(donateConfig.alipayTipImage)}
                      alt="支付宝收款码"
                      className="w-52 h-52 min-w-[208px] min-h-[208px] rounded-xl border border-border object-contain bg-white"
                    />
                  </div>
                )}
              </div>
            )}
            {donateConfig.other && (
              <a href={donateConfig.other} target="_blank" rel="noopener noreferrer" className="block text-center text-accent hover:underline text-sm">
                {t.donateLink}
              </a>
            )}
          </div>
        ) : (
          <p className="text-text-muted text-sm text-center py-4">
            请在 <code className="text-xs bg-surface px-1 rounded">src/lib/donate-config.ts</code> 中配置打赏链接或收款码。
          </p>
        )}
      </div>
    </div>
  )
}
