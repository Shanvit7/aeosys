"use client"

import type { ComponentProps } from "react"
import ErrorPage from "./error"
import "./globals.css"

const GlobalError = (props: ComponentProps<typeof ErrorPage>) => (
  <html lang="en" className="h-full antialiased dark">
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </head>
    <body>
      <ErrorPage {...props} />
    </body>
  </html>
)

export default GlobalError
