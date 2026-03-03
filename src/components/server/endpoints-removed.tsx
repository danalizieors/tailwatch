import { Link } from '@tanstack/react-router'
import { AlertTriangle, Home } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'

interface EndpointsRemovedProps {
  title: string
  description: string
}

export function EndpointsRemoved({
  title,
  description,
}: EndpointsRemovedProps) {
  return (
    <main className='mx-auto flex min-h-dvh w-full max-w-3xl items-center px-4 py-10 md:min-h-dvh'>
      <Card className='border-border/70 bg-card/85 w-full backdrop-blur'>
        <CardHeader className='space-y-3'>
          <div className='border-warning/35 bg-warning/10 text-warning inline-flex h-10 w-10 items-center justify-center rounded-lg border'>
            <AlertTriangle className='h-5 w-5' />
          </div>
          <CardTitle className='text-lg font-black tracking-wide uppercase'>
            {title}
          </CardTitle>
          <CardDescription className='text-muted-foreground text-sm'>
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className='flex flex-wrap gap-2'>
          <Link
            to='/'
            className='border-border hover:bg-muted inline-flex h-8 items-center gap-2 rounded-md border px-3 text-xs font-medium'
          >
            <Home className='h-4 w-4' />
            Back to home
          </Link>
        </CardContent>
      </Card>
    </main>
  )
}
