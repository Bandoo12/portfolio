import Container from '@/components/ui/Container';
import ResponsiveImage from '@/components/ResponsiveImage';

export default function ScreensGrid({
  images,
  cols = 3,
  heading,
}: {
  images: string[];
  cols?: 2 | 3;
  heading?: string;
}) {
  return (
    <Container>
      {heading && <h3 className="mb-4 text-lg font-semibold">{heading}</h3>}
      <div className={`grid gap-6 ${cols === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
        {images.map((src, i) => (
          <div key={i} className="rounded-xl border border-black/10 bg-white p-2">
            <ResponsiveImage
              src={src}
              alt={`Экран ${i + 1}`}
              ratio="16/10"
              sizes="(max-width:768px) 100vw, 33vw"
            />
          </div>
        ))}
      </div>
    </Container>
  );
}
