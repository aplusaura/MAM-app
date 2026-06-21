export function PageTransition({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={className ?? "space-y-4"}>
      {children}
    </div>
  );
}
