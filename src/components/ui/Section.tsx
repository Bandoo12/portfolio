export default function Section({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  return <section id={id} className={`py-12 md:py-16 ${className}`}>{children}</section>;
}
