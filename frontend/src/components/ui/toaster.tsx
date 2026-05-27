"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { CircleCheckIcon, OctagonXIcon } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider swipeDirection="right">
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const isDestructive = variant === "destructive"

        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex w-full gap-3">
              {isDestructive ? (
                <OctagonXIcon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              ) : (
                <CircleCheckIcon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              )}
              <div className="flex min-w-0 grow flex-col gap-3">
                <div className="space-y-1">
                  {title && <ToastTitle>{title}</ToastTitle>}
                  {description && (
                    <ToastDescription>{description}</ToastDescription>
                  )}
                </div>
                {action && <div>{action}</div>}
              </div>
            </div>
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
