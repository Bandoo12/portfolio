import Container from '@/components/ui/Container';

export default function Stats({ items }: { items: { value: string; label: string }[] }) {
  return (
    <Container>
      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
        {items.map((it, i) => (
          <div key={i} className="rounded-xl border border-black/10 bg-white p-5 text-center">
            <div className="text-2xl font-bold">{it.value}</div>
            <div className="text-sm text-zinc-600">{it.label}</div>
          </div>
        ))}
      </div>
    </Container>
  );
}
