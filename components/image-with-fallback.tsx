"use client"

import Image, { type ImageProps } from "next/image"
import { useState } from "react"

interface ImageWithFallbackProps extends Omit<ImageProps, "src"> {
  src: string
  fallbackSrc?: string
}

export function ImageWithFallback({ src, fallbackSrc = "/placeholder.svg", alt, ...props }: ImageWithFallbackProps) {
  const [imgSrc, setImgSrc] = useState(src)
  const [error, setError] = useState(false)

  return (
    <Image
      {...props}
      src={error ? fallbackSrc : imgSrc}
      alt={alt}
      onError={() => {
        setError(true)
        setImgSrc(fallbackSrc)
      }}
    />
  )
}
