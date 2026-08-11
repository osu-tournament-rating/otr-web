import Image from 'next/image';

export default function Page() {
  return (
    <div className="relative">
      <Image src={'/images/error-background.svg'} alt="Error background" fill />
      <div className="m-5 flex flex-col gap-2 p-10 text-center">
        <p className="text-4xl font-bold tracking-tight text-primary">
          404 Not Found
        </p>
        <p className="text-accent-foreground">
          Sorry, we don&apos;t have that page!
        </p>
      </div>
    </div>
  );
}
