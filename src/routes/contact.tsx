import { createFileRoute } from '@tanstack/react-router'
import { PublicFooter } from '~/components/layout/public-footer'
import { PublicHeader } from '~/components/layout/public-header'
import { PublicPageShell } from '~/components/layout/public-page-shell'
import { buildPublicPageHead } from '~/lib/seo'

export const Route = createFileRoute('/contact')({
  head: () =>
    buildPublicPageHead({
      title: 'Contact | Tailwatch',
      description:
        'Send a message to Tailwatch through the contact publish endpoint or open a GitHub issue.',
      path: '/contact',
      type: 'website',
    }),
  component: ContactPage,
})

function ContactPage() {
  return (
    <PublicPageShell>
      <PublicHeader />

      <main className='mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-6 px-4 py-8 md:gap-8 md:px-6 md:py-12'>
        <section className='space-y-4'>
          <h1 className='text-foreground text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl'>
            Contact
          </h1>
          <p className='text-muted-foreground max-w-3xl text-base leading-7 md:text-lg'>
            The quickest way to reach me is to publish a message to the
            Tailwatch <code>contact</code> volume with its key. If you prefer,
            you can also open a GitHub issue.
          </p>
        </section>

        <section className='space-y-4'>
          <h2 className='text-foreground text-xl font-semibold tracking-tight md:text-2xl'>
            Send a message with curl
          </h2>
          <p className='text-muted-foreground text-sm leading-7 md:text-base'>
            Send a plain-text message body to the publish endpoint.
          </p>
          <pre className='text-primary/85 overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-4 font-mono text-[11px] leading-relaxed'>
            <code>{`curl https://tailwatch.dev/api/publish/contact/message \\
  -d 'Hi, I would like to discuss Tailwatch. Reply at me@example.com'`}</code>
          </pre>
        </section>
      </main>
      <PublicFooter maxWidthClassName='max-w-5xl' />
    </PublicPageShell>
  )
}
