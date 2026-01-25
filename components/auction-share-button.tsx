"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Share2, Facebook, Twitter, Mail, QrCode, Download } from "lucide-react"
import { toast } from "sonner"
import { useEffect, useRef } from "react"

interface AuctionShareButtonProps {
  auctionId: string
  auctionTitle: string
  auctionImage?: string
  auctionDescription?: string
  className?: string
}

export function AuctionShareButton({
  auctionId,
  auctionTitle,
  auctionImage,
  auctionDescription,
  className,
}: AuctionShareButtonProps) {
  const [showQRDialog, setShowQRDialog] = useState(false)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("")
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const getShareUrl = () => {
    if (typeof window === "undefined") return ""
    return `${window.location.origin}/auctions/${auctionId}`
  }

  const shareUrl = getShareUrl()

  // Generate QR code when dialog opens
  useEffect(() => {
    if (showQRDialog && canvasRef.current) {
      generateQRCode()
    }
  }, [showQRDialog])

  const generateQRCode = async () => {
    try {
      // Use a simple QR code generation approach
      const qrSize = 300
      const url = shareUrl

      // Create QR code using a third-party API (qrserver.com is a free service)
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(url)}&format=png`

      setQrCodeDataUrl(qrImageUrl)
    } catch (error) {
      console.error("[v0] Failed to generate QR code:", error)
      toast.error("Failed to generate QR code")
    }
  }

  const handleDownloadQR = () => {
    if (!qrCodeDataUrl) return

    const link = document.createElement("a")
    link.href = qrCodeDataUrl
    link.download = `auction-${auctionId}-qr.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("QR code downloaded")
  }

  const handleShareFacebook = () => {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
    window.open(fbUrl, "_blank", "width=600,height=400")
    toast.success("Opening Facebook share")
  }

  const handleShareTwitter = () => {
    const text = `Check out this auction item: ${auctionTitle}`
    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`
    window.open(twitterUrl, "_blank", "width=600,height=400")
    toast.success("Opening X (Twitter) share")
  }

  const handleSharePinterest = () => {
    const description = auctionDescription || auctionTitle
    const image = auctionImage || ""
    const pinterestUrl = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&media=${encodeURIComponent(image)}&description=${encodeURIComponent(description)}`
    window.open(pinterestUrl, "_blank", "width=600,height=400")
    toast.success("Opening Pinterest share")
  }

  const handleShareEmail = () => {
    const subject = `Check out this auction: ${auctionTitle}`
    const body = `I thought you might be interested in this auction item:\n\n${auctionTitle}\n\n${shareUrl}`
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.location.href = mailtoUrl
    toast.success("Opening email client")
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl)
    toast.success("Link copied to clipboard")
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className={className}>
            <Share2 className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Share this auction</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleShareFacebook}>
            <Facebook className="mr-2 h-4 w-4" />
            Share on Facebook
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleShareTwitter}>
            <Twitter className="mr-2 h-4 w-4" />
            Share on X
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleSharePinterest}>
            <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
            </svg>
            Share on Pinterest
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleShareEmail}>
            <Mail className="mr-2 h-4 w-4" />
            Share via Email
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => setShowQRDialog(true)}>
            <QrCode className="mr-2 h-4 w-4" />
            Show QR Code
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleCopyLink}>
            <Share2 className="mr-2 h-4 w-4" />
            Copy Link
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>QR Code</DialogTitle>
            <DialogDescription>Scan this QR code to share the auction item</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="rounded-lg border p-4 bg-white">
              {qrCodeDataUrl ? (
                <img src={qrCodeDataUrl || "/placeholder.svg"} alt="QR Code" className="w-64 h-64" />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center bg-muted">
                  <QrCode className="h-16 w-16 text-muted-foreground animate-pulse" />
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <div className="flex gap-2 w-full">
              <Button onClick={handleDownloadQR} className="flex-1" disabled={!qrCodeDataUrl}>
                <Download className="mr-2 h-4 w-4" />
                Download QR Code
              </Button>
            </div>
            <p className="text-sm text-muted-foreground text-center break-all">{shareUrl}</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
