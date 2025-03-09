export default async function Page() {
  return (
    <div className="flex flex-col bg-accent p-10 m-5 rounded-4xl">
      <p className="text-4xl font-mono">Unauthorized</p>
      <p className="text-accent-foreground font-mono">
        o!TR is currently under whitelist-only access.
        <br />
        Please sign in or come back later!
      </p>
    </div>
  );
}
