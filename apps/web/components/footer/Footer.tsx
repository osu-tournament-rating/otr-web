import Link from 'next/link';

const navItems = [
  { parent: 'About', title: 'Docs', href: 'https://docs.otr.stagec.xyz' },
  {
    parent: 'About',
    title: 'Team',
    href: 'https://docs.otr.stagec.xyz/About/Team',
  },
  {
    parent: 'Contact',
    title: 'Discord',
    href: 'https://discord.gg/R53AwX2tJA',
  },
  {
    parent: 'Contact',
    title: 'Status',
    href: 'https://status.stagec.xyz/status/otr',
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
    <footer className="bg-card">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="flex justify-center">
          <div className="grid grid-cols-2 gap-x-16 gap-y-8 md:grid-cols-4">
            {Object.entries(groupedItems).map(([parent, items]) => (
              <div key={parent} className="space-y-2">
                <span className="text-primary text-lg font-semibold">
                  {parent}
                </span>
                <ul className="space-y-1">
                  {items.map((item) => (
                    <li key={item.title}>
                      <Link
                        href={item.href}
                        target={item.parent === 'Browse' ? '' : '_blank'}
                        className="text-muted-foreground hover:text-accent-foreground text-sm"
                      >
                        {item.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="border-border text-muted-foreground mt-4 border-t pt-4 text-center text-sm">
          <span>&copy; 2025 osu! Tournament Rating</span>
        </div>
      </div>
    </footer>
  );
}
