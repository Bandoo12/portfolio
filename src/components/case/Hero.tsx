import Container from '@/components/ui/Container';
import { H1 } from '@/components/ui/Heading';
import ResponsiveImage from '@/components/ResponsiveImage';

export default function CaseHero({ heading, text, image }: { heading: string; text?: string; image?: string }) {
  return (
    <header className="bg-white">
      <Container className="py-10 md:py-14">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <H1 className="mb-4">{heading}</H1>
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
    </header>
  );
}
