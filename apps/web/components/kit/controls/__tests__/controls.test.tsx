import { describe, expect, it } from 'bun:test';
import { History, Trash2, Trophy } from 'lucide-react';
import Link from 'next/link';
import type * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useForm } from 'react-hook-form';

import { AdminMenu } from '@/components/kit/controls/AdminMenu';
import { Button } from '@/components/kit/controls/Button';
import { ConfirmDialog } from '@/components/kit/controls/ConfirmDialog';
import { DialogTemplate } from '@/components/kit/controls/DialogTemplate';
import { FormFieldLabel } from '@/components/kit/controls/FormFieldLabel';
import {
  FormActions,
  FormGrid,
  FormPanel,
  FormSection,
} from '@/components/kit/controls/FormPanel';
import { IconButton } from '@/components/kit/controls/IconButton';
import { RowActionsMenu } from '@/components/kit/controls/RowActionsMenu';
import { Form, FormField, FormItem } from '@/components/ui/form';
import { TooltipProvider } from '@/components/ui/tooltip';

const render = (node: React.ReactNode) =>
  renderToStaticMarkup(<TooltipProvider>{node}</TooltipProvider>);

/** The class attribute of the first element with this tag. */
const classOf = (html: string, tag = 'button') =>
  new RegExp(`<${tag}[^>]*class="([^"]*)"`).exec(html)?.[1] ?? '';

describe('Button', () => {
  it('maps the three sizes onto 32, 36 and 40px', () => {
    expect(classOf(render(<Button size="sm">Save</Button>))).toContain('h-8');
    expect(classOf(render(<Button>Save</Button>))).toContain('h-9');
    expect(classOf(render(<Button size="lg">Save</Button>))).toContain('h-10');
  });

  it('is type="button" unless told otherwise', () => {
    expect(render(<Button>Cancel</Button>)).toContain('type="button"');
    expect(render(<Button type="submit">Save</Button>)).toContain(
      'type="submit"'
    );
  });

  it('gives ghost buttons a hover fill', () => {
    expect(
      classOf(render(<Button variant="ghost">Clear all</Button>))
    ).toContain('hover:bg-accent');
  });

  it('never fills a destructive trigger, only the final confirm', () => {
    const trigger = classOf(
      render(<Button variant="destructive">Delete tournament</Button>)
    );
    const confirm = classOf(
      render(<Button variant="destructive-confirm">Delete tournament</Button>)
    );

    expect(trigger).toContain('text-destructive-foreground');
    expect(trigger).not.toMatch(/\bbg-destructive(-solid)?(\s|$)/);
    expect(confirm).toContain('text-white');
  });

  it('fills the final confirm with the darker solid red', () => {
    // White text on dark mode's --destructive is under 4.5:1.
    const confirm = classOf(
      render(<Button variant="destructive-confirm">Delete tournament</Button>)
    );

    expect(confirm).toMatch(/\bbg-destructive-solid(\s|$)/);
    expect(confirm).toContain('hover:bg-destructive-solid/90');
    expect(confirm).not.toMatch(/\bbg-destructive(\s|$)/);
    expect(confirm).not.toContain('hover:bg-destructive/90');
  });

  it('swaps the icon for a spinner and disables itself while pending', () => {
    const idle = render(<Button icon={Trash2}>Delete</Button>);
    const busy = render(
      <Button icon={Trash2} pending>
        Deleting
      </Button>
    );

    expect(idle).toContain('lucide-trash');
    expect(busy).not.toContain('lucide-trash');
    expect(busy).toContain('animate-spin');
    expect(busy).toContain('disabled=""');
    expect(busy).toContain('aria-busy="true"');
  });

  it('puts the icon inside the child when drawn on a link', () => {
    const html = render(
      <Button asChild variant="outline" icon={Trophy}>
        <Link href="/tournaments">Tournaments</Link>
      </Button>
    );

    expect(html).toStartWith('<a');
    expect(html).toMatch(
      /<a[^>]*href="\/tournaments"[^>]*><svg[^>]*>.*<\/svg>Tournaments<\/a>/
    );
    expect(html).not.toContain('type=');
  });
});

describe('IconButton', () => {
  it('is named by its label and fills on hover', () => {
    const html = render(<IconButton label="Audit history" icon={History} />);
    const classes = classOf(html);

    expect(html).toContain('aria-label="Audit history"');
    expect(html).toContain('type="button"');
    expect(classes).toContain('size-8');
    expect(classes).toContain('hover:bg-accent');
    expect(classes).toContain('text-muted-foreground');
  });

  it('matches the button heights', () => {
    expect(
      classOf(render(<IconButton label="x" icon={History} size="default" />))
    ).toContain('size-9');
    expect(
      classOf(render(<IconButton label="x" icon={History} size="lg" />))
    ).toContain('size-10');
  });

  it('draws the dark pill on art and ignores the destructive tone there', () => {
    const classes = classOf(
      render(
        <IconButton
          label="Delete"
          icon={Trash2}
          variant="overlay"
          destructive
        />
      )
    );

    expect(classes).toContain('bg-black/55');
    expect(classes).toContain('rounded-full');
    expect(classes).not.toContain('text-destructive');
  });

  it('renders the glyph inside a link with asChild', () => {
    const html = render(
      <IconButton asChild label="Audit history" icon={History}>
        <Link href="/audit/tournaments/1" />
      </IconButton>
    );

    expect(html).toStartWith('<a');
    expect(html).toContain('aria-label="Audit history"');
    expect(html).toContain('lucide-history');
  });
});

describe('AdminMenu', () => {
  it('is one labelled button that opens a menu', () => {
    const html = render(
      <AdminMenu
        actions={[{ label: 'Edit tournament', onSelect: () => {} }]}
        data-testid="tournament-admin"
      />
    );

    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('data-testid="tournament-admin"');
    expect(html).toMatch(/<\/svg>Admin<svg/);
    expect(classOf(html)).toContain('h-8');
  });

  it('renders nothing when every action is hidden', () => {
    expect(
      render(<AdminMenu actions={[{ label: 'Edit', hidden: true }, false]} />)
    ).toBe('');
  });

  it('shows the notification dot with its screen-reader text', () => {
    const html = render(
      <AdminMenu
        actions={[{ label: 'Admin notes', onSelect: () => {} }]}
        notification="Has admin notes"
      />
    );

    expect(html).toContain('data-slot="notification-dot"');
    expect(html).toContain('Has admin notes');
  });

  it('uses the dark pill on art', () => {
    const html = render(
      <AdminMenu actions={[{ label: 'Edit beatmap' }]} onArt />
    );

    expect(classOf(html)).toContain('bg-black/55');
  });
});

describe('RowActionsMenu', () => {
  it('names the button after its row', () => {
    const html = render(
      <RowActionsMenu
        itemName="Hidden Chamber [Insane]"
        actions={[{ label: 'Edit game', onSelect: () => {} }]}
      />
    );

    expect(html).toContain('aria-label="Actions for Hidden Chamber [Insane]"');
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('lucide-ellipsis');
  });
});

describe('dialogs', () => {
  it('render only their trigger until opened', () => {
    const template = render(
      <DialogTemplate title="Edit tournament" trigger={<Button>Edit</Button>}>
        Body
      </DialogTemplate>
    );
    const confirm = render(
      <ConfirmDialog
        title="Delete this tournament?"
        description="This cannot be undone."
        confirmLabel="Delete tournament"
        onConfirm={() => {}}
        trigger={<Button variant="destructive">Delete</Button>}
      />
    );

    expect(template).toContain('aria-haspopup="dialog"');
    expect(template).not.toContain('Body');
    expect(confirm).toContain('aria-haspopup="dialog"');
    expect(confirm).not.toContain('This cannot be undone.');
  });
});

function FormDemo() {
  const form = useForm<{ name: string }>({ defaultValues: { name: '' } });

  return (
    <Form {...form}>
      <FormPanel data-testid="demo-form">
        <FormSection icon={Trophy} title="Tournament" description="Basics.">
          <FormGrid>
            <FormField
              control={form.control}
              name="name"
              render={() => (
                <FormItem>
                  <FormFieldLabel info="The full name." hint="Required">
                    Name
                  </FormFieldLabel>
                </FormItem>
              )}
            />
          </FormGrid>
        </FormSection>
        <FormSection title="Data">Fields</FormSection>
        <FormActions start="Changes apply on the next rating run.">
          <Button type="submit">Submit</Button>
        </FormActions>
      </FormPanel>
    </Form>
  );
}

describe('form layout', () => {
  const html = render(<FormDemo />);

  it('puts one form on one panel', () => {
    expect(html).toStartWith('<div data-slot="form-panel"');
    expect(html).toContain('rounded-xl border bg-card');
    expect(html).toContain(
      '<form class="flex flex-col" data-testid="demo-form"'
    );
  });

  it('heads each section with a strip and divides the sections', () => {
    expect(html).toContain('role="group" aria-label="Tournament"');
    expect(html).toContain(
      '<h2 class="truncate font-semibold">Tournament</h2>'
    );
    expect(html).toContain('<h2 class="truncate font-semibold">Data</h2>');
    expect(html).toContain('not-first:border-t');
  });

  it('labels fields with the info button and a hint', () => {
    expect(html).toContain('aria-label="About Name"');
    expect(html).toContain('Required');
  });

  it('keeps one label height so side-by-side inputs line up', () => {
    const label = /data-slot="form-field-label" class="([^"]*)"/.exec(html);

    expect(label?.[1]).toContain('min-h-5');
  });

  it('ends with the actions strip', () => {
    expect(html).toContain('data-slot="form-actions"');
    expect(html).toContain('Changes apply on the next rating run.');
    expect(html).toContain('type="submit"');
  });
});
