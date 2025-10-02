export default async function Page() {
  return (
    <div className="rounded-4xl bg-card m-5 flex flex-col gap-2 p-10 text-center">
      <p className="text-primary font-mono text-4xl">Unauthorized</p>
      <p className="text-accent-foreground font-mono">
        You are not authorized to access this page.
      </p>
    </div>
  );
}
