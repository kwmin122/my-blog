import LCPObserver from '@/components/text/LCPObserver'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function TextPage({ params }: Props) {
  const { slug } = await params
  return (
    <>
      <LCPObserver />
      <article>
        <h1>{slug}</h1>
      </article>
    </>
  )
}
