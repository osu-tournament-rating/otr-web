export default async function Page() {
  return (
    <div
      data-testid="unauthorized-container"
      className="m-5 flex flex-col gap-2 rounded-4xl bg-card p-10 text-center"
    >
      <p
        data-testid="unauthorized-heading"
        className="text-4xl font-bold tracking-tight text-primary"
      >
        Unauthorized
      </p>
      <p className="text-accent-foreground">
        You are not authorized to access this page.
      </p>
    </div>
  );
}
