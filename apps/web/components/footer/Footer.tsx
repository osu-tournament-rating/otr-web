import Link from 'next/link';

const navItems = [
  { parent: 'About', title: 'Docs', href: 'https://docs.otr.stagec.net' },
  {
    parent: 'About',
    title: 'Team',
    href: 'https://docs.otr.stagec.net/about/team',
  },
  {
    parent: 'Contact',
    title: 'Discord',
    href: 'https://discord.gg/R53AwX2tJA',
  },
  {
    parent: 'Contact',
    title: 'Status',
    href: 'https://status.stagec.net/status/otr',
  },
  {
    parent: 'Contribute',
    title: 'Donate',
    href: 'https://buymeacoffee.com/stagecodes',
  },
  {
    parent: 'Contribute',
    title: 'GitHub',
    href: 'https://github.com/osu-tournament-rating',
  },
  {
    parent: 'Browse',
    title: 'Leaderboard',
    href: '/leaderboard',
  },
  {
    parent: 'Browse',
    title: 'Tournaments',
    href: '/tournaments',
  },
] as const;

export default function Footer() {
  const groupedItems = navItems.reduce<
    Record<string, Array<(typeof navItems)[number]>>
  >((acc, item) => {
    if (!acc[item.parent]) acc[item.parent] = [];
    acc[item.parent].push(item);
    return acc;
  }, {});

  return (
    <footer data-testid="footer" className="bg-card">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <nav aria-label="Footer" className="flex justify-center">
          <div className="grid grid-cols-2 gap-x-16 gap-y-8 md:grid-cols-4">
            {Object.entries(groupedItems).map(([parent, items]) => (
              <div key={parent} className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-foreground">
                  {parent}
                </p>
                <ul className="flex flex-col gap-1">
                  {items.map((item) => {
                    const internal = item.parent === 'Browse';

                    return (
                      <li key={item.title}>
                        <Link
                          href={item.href}
                          target={internal ? undefined : '_blank'}
                          rel={internal ? undefined : 'noopener noreferrer'}
                          data-testid={
                            internal
                              ? `footer-${item.title.toLowerCase()}-link`
                              : undefined
                          }
                          className="rounded-sm text-sm text-muted-foreground transition-colors outline-none hover:text-link focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        >
                          {item.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>
        <div className="mt-6 border-t pt-4 text-center text-sm text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} osu! Tournament Rating</span>
        </div>
      </div>
    </footer>
  );
}
