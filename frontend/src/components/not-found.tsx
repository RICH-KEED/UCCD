'use client'

import { useRouter } from '@/hooks/use-router'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export function NotFoundPage() {
  const { navigate } = useRouter()
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-muted px-4 py-16">
      <div className="z-10 flex flex-col items-center justify-center gap-8">
        <div className="flex flex-col items-center justify-center gap-4">
          <h1 className="text-center text-4xl font-semibold tracking-tight text-foreground md:text-6xl">
            We lost this page
          </h1>
          <p className="text-center text-lg text-muted-foreground md:text-xl">
            The page you are looking for doesn&apos;t exist or has been moved.
          </p>
        </div>
        <div className="flex w-full flex-col items-center justify-center gap-3 md:flex-row">
          <Button
            variant="outline"
            className="w-full justify-center gap-2 md:w-auto"
            onClick={() => navigate('dashboard')}
          >
            <ArrowLeft className="h-4 w-4" />
            Go to Dashboard
          </Button>
          <Button
            className="w-full justify-center md:w-auto"
            onClick={() => navigate('landing')}
          >
            Go Home
          </Button>
        </div>
      </div>
    </div>
  )
}
