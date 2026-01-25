"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Facebook, Twitter, Link2, Printer, Instagram } from "lucide-react"
import QRCode from "qrcode"
import { useEffect } from "react"

interface ShareModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  url: string
  title: string
  description?: string
}

export function ShareModal({ open, onOpenChange, url, title, description }: ShareModalProps) {
  const { toast } = useToast()
  const [qrCodeUrl, setQrCodeUrl] = useState("")

  useEffect(() => {
    if (open && url) {
      QRCode.toDataURL(url, { width: 300, margin: 2 })
        .then((dataUrl) => setQrCodeUrl(dataUrl))
        .catch((err) => console.error("[v0] Error generating QR code:", err))
    }
  }, [open, url])

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url)
      toast({
        title: "Link Copied!",
        description: "The link has been copied to your clipboard.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link. Please try again.",
        variant: "destructive",
      })
    }
  }

  const shareToFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
    window.open(facebookUrl, "_blank", "width=600,height=400")
  }

  const shareToTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`
    window.open(twitterUrl, "_blank", "width=600,height=400")
  }

  const shareToInstagram = () => {
    // Instagram doesn't support direct sharing via URL, so we'll copy the link and inform the user
    copyToClipboard()
    toast({
      title: "Instagram Sharing",
      description: "Link copied! Open Instagram and paste the link in your post or story.",
    })
  }

  const printQRCode = () => {
    if (!qrCodeUrl) return

    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print QR Code - ${title}</title>
            <style>
              body {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                font-family: system-ui, -apple-system, sans-serif;
                padding: 20px;
              }
              h1 {
                margin-bottom: 20px;
                text-align: center;
              }
              img {
                max-width: 400px;
                border: 2px solid #e5e7eb;
                border-radius: 8px;
              }
              p {
                margin-top: 20px;
                text-align: center;
                color: #6b7280;
                word-break: break-all;
              }
              @media print {
                body {
                  padding: 0;
                }
              }
            </style>
          </head>
          <body>
            <h1>${title}</h1>
            <img src="${qrCodeUrl}" alt="QR Code" />
            <p>${url}</p>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
      }, 250)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Share {title}</DialogTitle>
          {description && (
            <div dangerouslySetInnerHTML={{ __html: description }} className="text-sm text-muted-foreground" />
          )}
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto flex-1 pr-4">
          {/* QR Code */}
          <div className="flex justify-center">
            {qrCodeUrl ? (
              <div className="border-2 rounded-lg p-4 bg-white">
                <img src={qrCodeUrl || "/placeholder.svg"} alt="QR Code" className="w-64 h-64" />
              </div>
            ) : (
              <div className="w-64 h-64 border-2 rounded-lg flex items-center justify-center bg-muted">
                <p className="text-sm text-muted-foreground">Generating QR code...</p>
              </div>
            )}
          </div>

          {/* Social Media Share Buttons */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Share on social media:</p>
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={shareToFacebook} variant="outline" className="w-full bg-transparent">
                <Facebook className="mr-2 h-4 w-4" />
                Facebook
              </Button>
              <Button onClick={shareToTwitter} variant="outline" className="w-full bg-transparent">
                <Twitter className="mr-2 h-4 w-4" />X (Twitter)
              </Button>
              <Button onClick={shareToInstagram} variant="outline" className="w-full col-span-2 bg-transparent">
                <Instagram className="mr-2 h-4 w-4" />
                Instagram
              </Button>
            </div>
          </div>

          {/* Copy and Print Buttons */}
          <div className="space-y-2">
            <Button onClick={copyToClipboard} variant="outline" className="w-full bg-transparent">
              <Link2 className="mr-2 h-4 w-4" />
              Copy Link
            </Button>
            <Button onClick={printQRCode} variant="outline" className="w-full bg-transparent" disabled={!qrCodeUrl}>
              <Printer className="mr-2 h-4 w-4" />
              Print QR Code
            </Button>
          </div>

          {/* URL Display */}
          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs text-muted-foreground break-all">{url}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
