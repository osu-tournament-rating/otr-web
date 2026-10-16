import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Palette } from 'lucide-react';

import LayoutSection from './sections/LayoutSection';
import StatusSection from './sections/StatusSection';
import ColorSection from './sections/ColorSection';
import ListsSection from './sections/ListsSection';
import TablesSection from './sections/TablesSection';
import FeedbackSection from './sections/FeedbackSection';
import ControlsSection from './sections/ControlsSection';
import FormatSection from './sections/FormatSection';
import { PageHeader } from '@/components/kit/layout/PageHeader';
import { auth } from '@/lib/auth/auth';
import { hasAdminScope } from '@/lib/auth/roles';

export const metadata: Metadata = {
  title: 'Design reference',
};

const SECTIONS = [
  { id: 'layout', title: 'Layout and surfaces' },
  { id: 'status', title: 'Status and badges' },
  { id: 'color', title: 'Colour and charts' },
  { id: 'lists', title: 'Lists, search and filters' },
  { id: 'tables', title: 'Tables, rows and paging' },
  { id: 'feedback', title: 'Empty, error and notices' },
  { id: 'controls', title: 'Buttons, dialogs and forms' },
  { id: 'format', title: 'Dates, numbers and names' },
];

/**
 * Every shared component in both themes, with static demo data, so agents
 * and admins can check a component without finding a page that uses it.
 */
export default async function DesignReferencePage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session || !hasAdminScope(session.dbUser?.scopes ?? [])) {
    redirect('/unauthorized');
  }

  return (
    <div
      className="flex flex-col gap-8 px-4 sm:px-0"
      data-testid="design-reference"
    >
      <div className="flex flex-col gap-4">
        <PageHeader
          icon={Palette}
          title="Design reference"
          description="Every shared component, in light and dark."
        />
        <nav
          aria-label="Sections"
          className="flex flex-wrap gap-x-4 gap-y-1 text-sm"
        >
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="text-muted-foreground hover:text-foreground"
            >
              {section.title}
            </a>
          ))}
        </nav>
      </div>
      <LayoutSection />
      <StatusSection />
      <ColorSection />
      <ListsSection />
      <TablesSection />
      <FeedbackSection />
      <ControlsSection />
      <FormatSection />
    </div>
  );
}
