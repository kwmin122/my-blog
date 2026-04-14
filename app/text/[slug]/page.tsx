interface Props {
  params: Promise<{ slug: string }>
}

export default async function TextPage({ params }: Props) {
  const { slug } = await params
  return (
    <article>
      <h1>{slug}</h1>
    </article>
  )
}
