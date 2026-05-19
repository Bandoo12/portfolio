import Container from '@/components/ui/Container';
import { H2 } from '@/components/ui/Heading';
import ResponsiveImage from '@/components/ResponsiveImage';

export default function FeatureRow({
  heading,
  text,
  image,
  reverse,
}: {
  heading: string;
  text?: string;
  image?: string;
  reverse?: boolean;
}) {
  return (
    <Container>
      <div className={`grid gap-8 md:grid-cols-2 md:items-center ${reverse ? 'md:[&>div:first-child]:order-2' : ''}`}>
        <div>
          <H2 className="mb-3">{heading}</H2>
          {text && <p className="text-zinc-600">{text}</p>}
        </div>
        {image && (
          <ResponsiveImage
            src={image}
            alt={heading}
            ratio="16/10"
            sizes="(max-width:768px) 100vw, 50vw"
            className="rounded-xl"
          />
        )}
      </div>
    </Container>
  );
}
