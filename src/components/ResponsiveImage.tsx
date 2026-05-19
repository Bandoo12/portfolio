import Image from 'next/image';

type Props = {
  src: string;
  alt: string;
  ratio?: string;
  priority?: boolean;
  className?: string;
  sizes?: string;
};

export default function ResponsiveImage({
  src,
  alt,
  ratio = '16/9',
  priority = false,
  className = '',
  sizes = '(max-width:768px) 100vw, (max-width:1280px) 70vw, 1200px',
}: Props) {
  return (
    <div
      className={`relative w-full overflow-hidden ${className}`}
      style={{ aspectRatio: ratio }}
    >
      <Image
        src={`/img/${src}`}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        style={{ objectFit: 'cover' }}
      />
    </div>
  );
}
