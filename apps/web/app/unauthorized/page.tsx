export default async function Page() {
  return (
    <div className="m-5 flex flex-col gap-2 rounded-4xl bg-card p-10 text-center">
      <p className="font-mono text-4xl text-primary">Unauthorized</p>
      <p className="font-mono text-accent-foreground">
        You are not authorized to access this page.
      </p>
    </div>
  );
}
