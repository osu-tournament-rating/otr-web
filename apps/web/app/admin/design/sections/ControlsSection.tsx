'use client';

import { VerificationStatus } from '@otr/core/osu';
import {
  ArrowDownWideNarrow,
  CalendarDays,
  Database,
  ExternalLink,
  Filter,
  Flag,
  Gamepad2,
  GitMerge,
  History,
  ListChecks,
  Music2,
  NotebookPen,
  PencilLine,
  Play,
  RefreshCw,
  RotateCcw,
  Swords,
  Target,
  Trash2,
  Trophy,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import Image from 'next/image';
import * as React from 'react';
import { useForm } from 'react-hook-form';

import { GallerySection, Specimen } from '../gallery';
import { AdminMenu } from '@/components/kit/controls/AdminMenu';
import { Button, type ButtonSize } from '@/components/kit/controls/Button';
import { ConfirmDialog } from '@/components/kit/controls/ConfirmDialog';
import {
  DIALOG_CLASSES,
  DIALOG_SIZE_CLASSES,
  DialogFooterStrip,
  DialogTemplate,
  type DialogSize,
} from '@/components/kit/controls/DialogTemplate';
import { FormFieldLabel } from '@/components/kit/controls/FormFieldLabel';
import {
  FormActions,
  FormGrid,
  FormPanel,
  FormSection,
} from '@/components/kit/controls/FormPanel';
import { IconButton } from '@/components/kit/controls/IconButton';
import { RowActionsMenu } from '@/components/kit/controls/RowActionsMenu';
import { Callout } from '@/components/kit/feedback/Callout';
import { DetailHero, HeroMetaItem } from '@/components/kit/layout/DetailHero';
import { PageHeader } from '@/components/kit/layout/PageHeader';
import { Panel, PanelBody } from '@/components/kit/layout/Panel';
import { RowList, RowListItem } from '@/components/kit/layout/RowList';
import { SectionHeader } from '@/components/kit/layout/SectionHeader';
import { typeScale } from '@/components/kit/layout/Typography';
import { Badge } from '@/components/kit/status/Badge';
import { VerificationStatusBadge } from '@/components/kit/status/VerificationStatusBadge';
import { VerificationStatusIcon } from '@/components/kit/status/VerificationStatusIcon';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RATED_RULESETS, RULESET_NAMES } from '@/lib/kit/format/ruleset';
import { cn } from '@/lib/utils';

const KIT = '@/components/kit/controls';

/** Stands in for a network call in the demos. */
const wait = (ms: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, ms));

/** A small caption under a demo control. */
function Caption({ children }: { children: React.ReactNode }) {
  return <span className={typeScale.meta}>{children}</span>;
}

const SIZES: { size: ButtonSize; name: string; use: string }[] = [
  {
    size: 'sm',
    name: 'Small, 32px',
    use: 'Inside panels and heroes: section headers, rows, hero actions, menus.',
  },
  {
    size: 'default',
    name: 'Default, 36px',
    use: 'Form and dialog actions, page header actions.',
  },
  {
    size: 'lg',
    name: 'Large, 40px',
    use: 'List toolbars, beside the 40px search field and sort select.',
  },
];

function ButtonSizes() {
  return (
    <div className="flex flex-col gap-5">
      {SIZES.map(({ size, name, use }) => (
        <div key={size} className="flex flex-col gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{name}</span>
            <Caption>{use}</Caption>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size={size} variant="outline">
              Cancel
            </Button>
            <Button size={size}>Save changes</Button>
            <IconButton
              size={size}
              variant="outline"
              label="Filters"
              icon={Filter}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ButtonVariants() {
  const [saving, setSaving] = React.useState(false);

  const items: { caption: string; control: React.ReactNode }[] = [
    {
      caption: 'Primary, one per view',
      control: <Button icon={Trophy}>Submit tournament</Button>,
    },
    {
      caption: 'Secondary',
      control: <Button variant="outline">Cancel</Button>,
    },
    {
      caption: 'Quiet, inside a panel',
      control: <Button variant="ghost">Clear all</Button>,
    },
    {
      caption: 'Destructive: opens a confirm',
      control: (
        <Button variant="destructive" icon={Trash2}>
          Delete tournament
        </Button>
      ),
    },
    {
      caption: 'Final confirm only',
      control: <Button variant="destructive-confirm">Delete tournament</Button>,
    },
    {
      caption: 'Pending (click it)',
      control: (
        <Button
          pending={saving}
          onClick={async () => {
            setSaving(true);
            await wait(1500);
            setSaving(false);
          }}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      ),
    },
    {
      caption: 'Drawn on a link',
      control: (
        <Button asChild variant="outline" icon={ExternalLink}>
          <a href="#controls-button-variants">Acceptance criteria</a>
        </Button>
      ),
    },
  ];

  return (
    <div className="@container">
      <div className="grid gap-x-6 gap-y-5 @sm:grid-cols-2">
        {items.map(({ caption, control }) => (
          <div key={caption} className="flex flex-col items-start gap-1.5">
            {control}
            <Caption>{caption}</Caption>
          </div>
        ))}
      </div>
    </div>
  );
}

function IconButtons() {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <IconButton size="sm" label="Audit history" icon={History} />
            <IconButton size="default" label="Audit history" icon={History} />
            <IconButton size="lg" label="Audit history" icon={History} />
          </div>
          <Caption>Ghost, the default: 32, 36 and 40px</Caption>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <IconButton
              size="sm"
              variant="outline"
              label="Sort descending"
              icon={ArrowDownWideNarrow}
            />
            <IconButton
              size="default"
              variant="outline"
              label="Sort descending"
              icon={ArrowDownWideNarrow}
            />
            <IconButton
              size="lg"
              variant="outline"
              label="Sort descending"
              icon={ArrowDownWideNarrow}
            />
          </div>
          <Caption>Outline, beside inputs</Caption>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <IconButton label="Delete note" icon={Trash2} destructive />
          </div>
          <Caption>Destructive, outside a menu</Caption>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <IconButton asChild label="View on osu!" icon={ExternalLink}>
              <a
                href="https://osu.ppy.sh/beatmaps/1872396"
                target="_blank"
                rel="noopener noreferrer"
              />
            </IconButton>
          </div>
          <Caption>Drawn on a link</Caption>
        </div>
      </div>
      <Panel>
        <SectionHeader
          icon={Swords}
          title="Matches"
          meta="124 matches"
          actions={<IconButton label="Refresh matches" icon={RefreshCw} />}
        />
        <PanelBody className={typeScale.bodyMuted}>
          In a section header strip: small and ghost.
        </PanelBody>
      </Panel>
    </div>
  );
}

function EditTournamentDialog({
  open,
  onOpenChange,
  trigger,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactElement;
}) {
  const id = React.useId();
  const [saving, setSaving] = React.useState(false);
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const isOpen = open ?? uncontrolledOpen;
  const setOpen = (next: boolean) => {
    setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  return (
    <DialogTemplate
      open={isOpen}
      onOpenChange={setOpen}
      trigger={trigger}
      title="Edit tournament"
      description="Changes apply on the next rating run."
      onSubmit={async (event) => {
        event.preventDefault();
        setSaving(true);
        await wait(1200);
        setSaving(false);
        setOpen(false);
      }}
      footerStart="Last edited Oct 14, 2026"
      footer={
        <>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" pending={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-abbreviation`}>Abbreviation</Label>
          <Input id={`${id}-abbreviation`} defaultValue="BTMC" />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor={`${id}-name`}>Name</Label>
          <Input id={`${id}-name`} defaultValue="Break The Meta Cup" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-forum`}>Forum post URL</Label>
        <Input
          id={`${id}-forum`}
          defaultValue="https://osu.ppy.sh/community/forums/topics/1446216"
        />
      </div>
    </DialogTemplate>
  );
}

function AdminMenuDemo() {
  const [editOpen, setEditOpen] = React.useState(false);
  const [resetOpen, setResetOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deletePoolOpen, setDeletePoolOpen] = React.useState(false);
  const [includeVerified, setIncludeVerified] = React.useState(false);
  const checkboxId = React.useId();

  return (
    <>
      <DetailHero
        title="Break The Meta Cup"
        titleSuffix="BTMC"
        status={
          <VerificationStatusBadge
            status={VerificationStatus.Verified}
            reviewer="Stage"
            tooltip="tap"
          />
        }
        meta={
          <>
            <HeroMetaItem icon={Gamepad2}>osu!</HeroMetaItem>
            <HeroMetaItem icon={Users}>4v4</HeroMetaItem>
            <HeroMetaItem icon={Target}>Open rank</HeroMetaItem>
            <HeroMetaItem icon={CalendarDays}>Dec 4 – 18, 2021</HeroMetaItem>
          </>
        }
        adminActions={
          <AdminMenu
            title="Break The Meta Cup"
            notification="Has admin notes"
            actions={[
              {
                label: 'Edit tournament',
                icon: PencilLine,
                onSelect: () => setEditOpen(true),
              },
              {
                label: 'Admin notes',
                icon: NotebookPen,
                trailing: <Badge size="sm">2</Badge>,
                onSelect: () => {},
              },
              {
                label: 'Accept pre-verified data',
                icon: ListChecks,
                group: 'data',
                onSelect: () => {},
              },
              {
                label: 'Reset automated checks',
                icon: RotateCcw,
                group: 'data',
                onSelect: () => setResetOpen(true),
              },
              {
                label: 'Refetch match data',
                icon: RefreshCw,
                group: 'data',
                onSelect: () => {},
              },
              {
                label: 'Delete tournament',
                icon: Trash2,
                destructive: true,
                onSelect: () => setDeleteOpen(true),
              },
              {
                label: 'Delete pooled beatmaps',
                icon: Trash2,
                destructive: true,
                onSelect: () => setDeletePoolOpen(true),
              },
            ]}
          />
        }
        actions={
          <IconButton
            asChild
            variant="outline"
            label="View on the osu! forum"
            icon={ExternalLink}
          >
            <a
              href="https://osu.ppy.sh/community/forums/topics/1446216"
              target="_blank"
              rel="noopener noreferrer"
            />
          </IconButton>
        }
      />

      <EditTournamentDialog open={editOpen} onOpenChange={setEditOpen} />

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset automated checks?"
        description={
          <p>
            Every match, game and score in <strong>Break The Meta Cup</strong>{' '}
            goes back to Pending and the automated checks run again.
          </p>
        }
        confirmLabel="Reset checks"
        pendingLabel="Resetting…"
        onConfirm={() => wait(1200)}
      >
        <div className="flex items-center gap-2">
          <Checkbox
            id={checkboxId}
            checked={includeVerified}
            onCheckedChange={(checked) => setIncludeVerified(checked === true)}
          />
          <Label htmlFor={checkboxId}>
            Also reset verified and rejected data
          </Label>
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this tournament?"
        description={
          <>
            <p>
              This deletes <strong>Break The Meta Cup</strong> with its 124
              matches, 1,031 games and 8,240 scores.
            </p>
            <p>This cannot be undone.</p>
          </>
        }
        confirmLabel="Delete tournament"
        pendingLabel="Deleting…"
        onConfirm={() => wait(1200)}
      />

      <ConfirmDialog
        open={deletePoolOpen}
        onOpenChange={setDeletePoolOpen}
        title="Delete the pooled beatmaps?"
        description={
          <>
            <p>
              This removes all 56 pooled beatmaps from{' '}
              <strong>Break The Meta Cup</strong>. The beatmaps and their scores
              stay.
            </p>
            <p>This cannot be undone.</p>
          </>
        }
        confirmLabel="Delete pooled beatmaps"
        pendingLabel="Deleting…"
        onConfirm={() => wait(1200)}
      />
    </>
  );
}

const ART = (
  <Image
    src="/images/beatmap-background-narrow.png"
    alt=""
    fill
    sizes="(max-width: 1050px) 100vw, 1050px"
    loading="eager"
    className="object-cover saturate-75"
  />
);

function OnArtDemo() {
  return (
    <div className="flex flex-col gap-4">
      <DetailHero
        art={ART}
        title="HAELEQUIN"
        titleSuffix="[alacat's Light Insane]"
        meta={
          <>
            <HeroMetaItem icon={Music2}>orangentle</HeroMetaItem>
            <HeroMetaItem icon={UserRound}>Mapped by Gamu, alacat</HeroMetaItem>
          </>
        }
        adminActions={
          <AdminMenu
            onArt
            actions={[
              {
                label: 'Edit beatmap',
                icon: PencilLine,
                disabled: true,
                description: 'Only beatmaps the osu! API no longer serves',
              },
            ]}
          />
        }
        actions={
          <IconButton variant="overlay" label="Preview audio" icon={Play} />
        }
      />

      <div className="relative isolate flex h-32 flex-col justify-between overflow-hidden rounded-xl p-3 text-white">
        {ART}
        <div className="absolute inset-0 bg-black/60" aria-hidden />
        <div className="relative flex items-center justify-between gap-2">
          <span className="text-sm text-white/80">Team vs · Score v2</span>
          <RowActionsMenu
            onArt
            itemName="HAELEQUIN [alacat's Light Insane]"
            actions={[
              { label: 'Edit game', icon: PencilLine, onSelect: () => {} },
              { label: 'Admin notes', icon: NotebookPen, onSelect: () => {} },
              {
                label: 'Audit history',
                icon: History,
                href: '#controls-on-art',
              },
              { label: 'Report a problem', icon: Flag, onSelect: () => {} },
              {
                label: 'Merge with another game',
                icon: GitMerge,
                group: 'data',
                onSelect: () => {},
              },
              {
                label: 'Delete game',
                icon: Trash2,
                destructive: true,
                onSelect: () => {},
              },
            ]}
          />
        </div>
        <p className="relative truncate font-semibold">
          HAELEQUIN [alacat&apos;s Light Insane]
        </p>
      </div>
    </div>
  );
}

const GAMES = [
  {
    name: 'Hidden Chamber [Insane]',
    detail: 'Team vs · HR · 3:12',
    status: VerificationStatus.Verified,
  },
  {
    name: 'Kokoro no Kakera [Extra]',
    detail: 'Team vs · DT · 2:48',
    status: VerificationStatus.PreRejected,
  },
  {
    name: 'Ghost Rule [Tiebreaker]',
    detail: 'Team vs · FM · 4:05',
    status: VerificationStatus.None,
  },
];

function RowActionsDemo() {
  const [deleting, setDeleting] = React.useState<string | null>(null);

  return (
    <>
      <Panel>
        <SectionHeader icon={Swords} title="Games" meta="3 games" />
        <RowList>
          {GAMES.map((game) => (
            <RowListItem
              key={game.name}
              leading={
                <VerificationStatusIcon status={game.status} tooltip="tap" />
              }
              title={
                <a
                  href="#controls-row-actions-menu"
                  className="rounded-sm transition-colors hover:text-link focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  {game.name}
                </a>
              }
              description={game.detail}
              trailing={
                <RowActionsMenu
                  itemName={game.name}
                  actions={[
                    {
                      label: 'Edit game',
                      icon: PencilLine,
                      onSelect: () => {},
                    },
                    {
                      label: 'Admin notes',
                      icon: NotebookPen,
                      onSelect: () => {},
                    },
                    {
                      label: 'Audit history',
                      icon: History,
                      href: '#controls-row-actions-menu',
                    },
                    {
                      label: 'Merge with another game',
                      icon: GitMerge,
                      group: 'data',
                      onSelect: () => {},
                    },
                    {
                      label: 'Delete game',
                      icon: Trash2,
                      destructive: true,
                      onSelect: () => setDeleting(game.name),
                    },
                  ]}
                />
              }
            />
          ))}
        </RowList>
      </Panel>
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Delete this game?"
        description={
          <>
            <p>
              This deletes <strong>{deleting}</strong> and its 8 scores.
            </p>
            <p>This cannot be undone.</p>
          </>
        }
        confirmLabel="Delete game"
        pendingLabel="Deleting…"
        onConfirm={() => wait(1000)}
      />
    </>
  );
}

/** The dialog anatomy drawn in place, so both themes show it. */
function DialogAnatomy({
  title,
  description,
  closable = true,
  size = 'md',
  children,
  footer,
  footerStart,
}: {
  title: string;
  description?: string;
  closable?: boolean;
  /** ConfirmDialog is always `sm`. */
  size?: DialogSize;
  children: React.ReactNode;
  footer: React.ReactNode;
  footerStart?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        DIALOG_CLASSES.surface,
        DIALOG_SIZE_CLASSES[size],
        'relative w-full'
      )}
      aria-hidden
      inert
    >
      <div className={cn(DIALOG_CLASSES.header, closable && 'pr-14')}>
        <p className={DIALOG_CLASSES.title}>{title}</p>
        {description ? (
          <p className={DIALOG_CLASSES.description}>{description}</p>
        ) : null}
      </div>
      <div className={DIALOG_CLASSES.body}>{children}</div>
      <DialogFooterStrip start={footerStart}>{footer}</DialogFooterStrip>
      {closable ? (
        <div className="absolute top-3 right-4">
          <IconButton label="Close" icon={X} />
        </div>
      ) : null}
    </div>
  );
}

function DialogTemplateDemo() {
  return (
    <div className="flex flex-col items-start gap-4">
      <DialogAnatomy
        title="Edit tournament"
        description="Changes apply on the next rating run."
        footerStart="Last edited Oct 14, 2026"
        footer={
          <>
            <Button variant="outline">Cancel</Button>
            <Button>Save changes</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label>Abbreviation</Label>
            <Input defaultValue="BTMC" tabIndex={-1} />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label>Name</Label>
            <Input defaultValue="Break The Meta Cup" tabIndex={-1} />
          </div>
        </div>
      </DialogAnatomy>
      <EditTournamentDialog
        trigger={
          <Button variant="outline" icon={PencilLine}>
            Open the dialog
          </Button>
        }
      />
    </div>
  );
}

function ConfirmDialogDemo() {
  const [refetchVerified, setRefetchVerified] = React.useState(false);
  const checkboxId = React.useId();

  return (
    <div className="flex flex-col items-start gap-4">
      <DialogAnatomy
        title="Delete this tournament?"
        closable={false}
        size="sm"
        footer={
          <>
            <Button variant="outline">Cancel</Button>
            <Button variant="destructive-confirm">Delete tournament</Button>
          </>
        }
      >
        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          <p>
            This deletes <strong>Break The Meta Cup</strong> with its 124
            matches, 1,031 games and 8,240 scores.
          </p>
          <p>This cannot be undone.</p>
        </div>
      </DialogAnatomy>
      <div className="flex flex-wrap gap-2">
        <ConfirmDialog
          trigger={
            <Button variant="destructive" icon={Trash2}>
              Delete tournament
            </Button>
          }
          title="Delete this tournament?"
          description={
            <>
              <p>
                This deletes <strong>Break The Meta Cup</strong> with its 124
                matches, 1,031 games and 8,240 scores.
              </p>
              <p>This cannot be undone.</p>
            </>
          }
          confirmLabel="Delete tournament"
          pendingLabel="Deleting…"
          onConfirm={() => wait(1200)}
        />
        <ConfirmDialog
          tone="default"
          trigger={
            <Button variant="outline" icon={RefreshCw}>
              Refetch match data
            </Button>
          }
          title="Refetch match data?"
          description={
            <p>
              The data worker fetches all 124 matches from osu! again. Scores
              that changed go back to Pending.
            </p>
          }
          confirmLabel="Refetch match data"
          pendingLabel="Queueing…"
          onConfirm={() => wait(800)}
        >
          <div className="flex items-center gap-2">
            <Checkbox
              id={checkboxId}
              checked={refetchVerified}
              onCheckedChange={(checked) =>
                setRefetchVerified(checked === true)
              }
            />
            <Label htmlFor={checkboxId}>Include verified matches</Label>
          </div>
        </ConfirmDialog>
        <ConfirmDialog
          trigger={
            <Button variant="destructive" icon={Trash2}>
              Delete match (fails)
            </Button>
          }
          title="Delete this match?"
          description={<p>This deletes the match and its 9 games.</p>}
          confirmLabel="Delete match"
          pendingLabel="Deleting…"
          onConfirm={() =>
            wait(800).then(() => Promise.reject(new Error('demo')))
          }
        />
      </div>
    </div>
  );
}

type SubmissionValues = {
  abbreviation: string;
  name: string;
  forumUrl: string;
  ruleset: string;
  rankRange: string;
  // Not "matches": a control with that name would shadow form.matches().
  matchIds: string;
  beatmapIds: string;
};

function FormLayoutDemo() {
  const [submitting, setSubmitting] = React.useState(false);
  const form = useForm<SubmissionValues>({
    defaultValues: {
      abbreviation: '',
      name: '',
      forumUrl: '',
      ruleset: '',
      rankRange: '',
      matchIds: '',
      beatmapIds: '',
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        icon={Trophy}
        title="Submit a tournament"
        description="Add a tournament's matches so they can be verified and rated."
        actions={
          <Button asChild variant="outline" icon={ExternalLink}>
            <a
              href="https://docs.otr.stagec.net/rating-framework/data-processing/tournament-approval#acceptance-criteria"
              target="_blank"
              rel="noopener noreferrer"
            >
              Acceptance criteria
            </a>
          </Button>
        }
      />
      <Callout tone="info" title="Before you submit">
        Submit each tournament once, with the matches from every stage. An admin
        checks it against the acceptance criteria before it counts.
      </Callout>
      <Form {...form}>
        <FormPanel
          noValidate
          onSubmit={form.handleSubmit(async () => {
            setSubmitting(true);
            await wait(1200);
            setSubmitting(false);
            form.reset();
          })}
        >
          <FormSection icon={Trophy} title="Tournament">
            <FormGrid>
              <FormField
                control={form.control}
                name="abbreviation"
                rules={{ required: 'Enter the lobby prefix' }}
                render={({ field }) => (
                  <FormItem>
                    <FormFieldLabel info="The prefix of each lobby, such as OWC2024 in “OWC2024: (United States) vs (Canada)”.">
                      Abbreviation
                    </FormFieldLabel>
                    <FormControl>
                      <Input placeholder="OWC2024" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                rules={{ required: 'Enter the tournament name' }}
                render={({ field }) => (
                  <FormItem>
                    <FormFieldLabel info="The full name, such as osu! World Cup 2024.">
                      Name
                    </FormFieldLabel>
                    <FormControl>
                      <Input placeholder="osu! World Cup 2024" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormGrid>
            <FormField
              control={form.control}
              name="forumUrl"
              render={({ field }) => (
                <FormItem>
                  <FormFieldLabel hint="Optional">
                    Forum post URL
                  </FormFieldLabel>
                  <FormControl>
                    <Input
                      placeholder="https://osu.ppy.sh/community/forums/topics/…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormGrid>
              <FormField
                control={form.control}
                name="ruleset"
                render={({ field }) => (
                  <FormItem>
                    <FormFieldLabel>Ruleset</FormFieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pick a ruleset" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RATED_RULESETS.map((ruleset) => (
                          <SelectItem key={ruleset} value={String(ruleset)}>
                            {RULESET_NAMES[ruleset].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rankRange"
                render={({ field }) => (
                  <FormItem>
                    <FormFieldLabel info="The best rank allowed to register. Leave it empty for an open-rank tournament.">
                      Rank restriction
                    </FormFieldLabel>
                    <FormControl>
                      <Input
                        inputMode="numeric"
                        placeholder="Open rank"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormGrid>
          </FormSection>

          <FormSection
            icon={Database}
            title="Data"
            description="Paste osu! match and beatmap links, or their IDs."
          >
            <FormGrid>
              <FormField
                control={form.control}
                name="matchIds"
                rules={{ required: 'Add at least one match' }}
                render={({ field }) => (
                  <FormItem>
                    <FormFieldLabel hint="One per line">Matches</FormFieldLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-28"
                        placeholder="https://osu.ppy.sh/community/matches/115253744"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="beatmapIds"
                render={({ field }) => (
                  <FormItem>
                    <FormFieldLabel hint="One per line">
                      Beatmaps
                    </FormFieldLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-28"
                        placeholder="https://osu.ppy.sh/b/4448541"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormGrid>
          </FormSection>

          <FormActions start="An admin reviews every submission before it counts.">
            <Button
              variant="outline"
              disabled={submitting}
              onClick={() => form.reset()}
            >
              Clear
            </Button>
            <Button type="submit" pending={submitting}>
              {submitting ? 'Submitting…' : 'Submit tournament'}
            </Button>
          </FormActions>
        </FormPanel>
      </Form>
    </div>
  );
}

type LabelValues = { abbreviation: string; forumUrl: string; rank: string };

function FormFieldLabelDemo() {
  const form = useForm<LabelValues>({
    defaultValues: { abbreviation: 'BTMC', forumUrl: '', rank: 'top 10k' },
  });
  const { setError } = form;

  React.useEffect(() => {
    setError('rank', { message: 'Enter a rank as a whole number' });
  }, [setError]);

  return (
    <Form {...form}>
      <div className="flex flex-col gap-4">
        <FormGrid>
          <FormField
            control={form.control}
            name="abbreviation"
            render={({ field }) => (
              <FormItem>
                <FormFieldLabel info="The prefix of each lobby, such as OWC2024.">
                  Abbreviation
                </FormFieldLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="forumUrl"
            render={({ field }) => (
              <FormItem>
                <FormFieldLabel hint="Optional">Forum post URL</FormFieldLabel>
                <FormControl>
                  <Input placeholder="https://osu.ppy.sh/…" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </FormGrid>
        <FormField
          control={form.control}
          name="rank"
          render={({ field }) => (
            <FormItem>
              <FormFieldLabel info="The best rank allowed to register. Leave it empty for an open-rank tournament.">
                Rank restriction
              </FormFieldLabel>
              <FormControl>
                <Input inputMode="numeric" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </Form>
  );
}

export default function ControlsSection() {
  return (
    <GallerySection
      id="controls"
      title="Buttons, dialogs and forms"
      description="Button sizes, icon buttons, admin menus, dialogs and form layout."
    >
      <Specimen
        id="controls-button-sizes"
        name="Button sizes"
        importPath={`${KIT}/Button`}
        description="Three heights only. Small inside panels and heroes, default in forms and dialogs, large in list toolbars."
      >
        <ButtonSizes />
      </Specimen>

      <Specimen
        id="controls-button-variants"
        name="Button"
        importPath={`${KIT}/Button`}
        description="One primary action per view. Red marks an action that deletes or overwrites data; only the final confirm in a dialog is solid red."
      >
        <ButtonVariants />
      </Specimen>

      <Specimen
        id="controls-icon-button"
        name="IconButton"
        importPath={`${KIT}/IconButton`}
        description="Every icon-only control: an accessible name, a tooltip that repeats it, and a hover fill. Small and ghost unless it sits beside inputs."
      >
        <IconButtons />
      </Specimen>

      <Specimen
        id="controls-admin-menu"
        name="AdminMenu"
        importPath={`${KIT}/AdminMenu`}
        description="The one admin control in a detail hero. Every admin action, labelled, with destructive items last and red. Edit, reset and delete open their dialogs."
        stacked
      >
        <AdminMenuDemo />
      </Specimen>

      <Specimen
        id="controls-row-actions-menu"
        name="RowActionsMenu"
        importPath={`${KIT}/RowActionsMenu`}
        description="One overflow button at the end of a row or card in place of a cluster of icons, such as each game on a match page."
        stacked
      >
        <RowActionsDemo />
      </Specimen>

      <Specimen
        id="controls-on-art"
        name="Controls on cover art"
        importPath={`${KIT}/AdminMenu`}
        description="On art, AdminMenu, RowActionsMenu and IconButton take the dark pill (onArt, or variant overlay), white in both themes."
        stacked
      >
        <OnArtDemo />
      </Specimen>

      <Specimen
        id="controls-dialog-template"
        name="DialogTemplate"
        importPath={`${KIT}/DialogTemplate`}
        description="Every dialog that is not a confirmation: a header strip with a sentence-case title and close button, a body, and a footer with the actions on the right."
      >
        <DialogTemplateDemo />
      </Specimen>

      <Specimen
        id="controls-confirm-dialog"
        name="ConfirmDialog"
        importPath={`${KIT}/ConfirmDialog`}
        description="Confirms one consequential action. The title asks a question, the body says what happens, and the confirm button names the action."
      >
        <ConfirmDialogDemo />
      </Specimen>

      <Specimen
        id="controls-form-layout"
        name="FormPanel, FormSection, FormActions"
        importPath={`${KIT}/FormPanel`}
        description="A page form: the standard page header, one panel, sections split by header strips, and normal-sized actions at the bottom right. Submit it empty to see the errors."
        stacked
      >
        <FormLayoutDemo />
      </Specimen>

      <Specimen
        id="controls-form-field-label"
        name="FormFieldLabel"
        importPath={`${KIT}/FormFieldLabel`}
        description="A field label with the info button for help and an optional muted hint. Labels keep one height, so inputs side by side line up, and turn red with the field's error."
      >
        <FormFieldLabelDemo />
      </Specimen>
    </GallerySection>
  );
}
