export default function AuditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container mx-auto flex flex-col gap-4 py-4">
      {children}
    </div>
  );
}
