import Link from 'next/link';

const navItems = [
  {
    parent: 'About',
    title: 'Docs',
    href: 'https://docs.otr.stagec.xyz',
  },
  {
    parent: 'About',
    title: 'Team',
    href: 'https://docs.otr.stagec.xyz/team.html',
  },
  {
    parent: 'Contact',
    title: 'Discord',
    href: 'https://discord.gg/R53AwX2tJA',
  },
  {
    parent: 'Contribute',
    title: 'GitHub',
    href: 'https://github.com/osu-tournament-rating',
  },
] as const satisfies {
  parent: string;
  title: string;
  href: string;
}[];

export default function Footer() {
  // Group items by parent
  const groupedItems = navItems.reduce(
    (acc, item) => {
      if (!acc[item.parent]) {
        acc[item.parent] = [];
      }
      acc[item.parent].push(item);
      return acc;
    },
    {} as Record<string, typeof navItems>
  );

  return (
    <footer className="m-auto bg-card">
      <div className="container mx-auto w-[50%] py-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {Object.entries(groupedItems).map(([parent, items]) => (
            <div key={parent} className="space-y-2">
              <h3 className="text-lg font-semibold text-primary">{parent}</h3>
              <ul className="space-y-1">
                {items.map((item) => (
                  <li key={item.title}>
                    <Link
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground transition-colors hover:text-accent-foreground"
                    >
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-4 border-t border-border pt-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} osu! Tournament Rating.</p>
        </div>
      </div>
    </footer>
  );
}
