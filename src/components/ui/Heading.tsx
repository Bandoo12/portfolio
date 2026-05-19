export const H1 = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <h1 className={`text-[clamp(28px,4vw,44px)] font-bold tracking-tight ${className}`}>{children}</h1>
);

export const H2 = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <h2 className={`text-[clamp(22px,3vw,32px)] font-semibold tracking-tight ${className}`}>{children}</h2>
);
