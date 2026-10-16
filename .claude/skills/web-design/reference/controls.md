# Buttons, dialogs and forms

How the site lays out actions: text and icon buttons, the one admin menu per page and per row, dialogs and confirmations, and page forms.
Import each component from its own file under `@/components/kit/controls/`; the menu grouping helper lives in `@/lib/kit/controls/menu`.

- [Rules at a glance](#rules-at-a-glance)
- [Button](#button): text buttons in three sizes
- [IconButton](#iconbutton): every icon-only control
- [AdminMenu](#adminmenu): the one admin control in a detail hero
- [RowActionsMenu](#rowactionsmenu): the overflow menu on a row or card
- [ActionMenu and MenuAction](#actionmenu-and-menuaction): the menu both are built on
- [DialogTemplate](#dialogtemplate): every dialog that is not a confirmation
- [ConfirmDialog](#confirmdialog): confirms one consequential action
- [FormPanel, FormSection, FormGrid and FormActions](#formpanel-formsection-formgrid-and-formactions): page forms
- [FormFieldLabel](#formfieldlabel): a field label with the info button

## Rules at a glance

- Three heights, the ones `components/ui/button.tsx` already has:

  | Size      | Height | Use                                                                            |
  | --------- | ------ | ------------------------------------------------------------------------------ |
  | `sm`      | 32px   | Inside panels and heroes: section headers, rows, hero actions, menus, popovers |
  | `default` | 36px   | Form and dialog actions, page header actions                                   |
  | `lg`      | 40px   | List toolbars, beside the 40px search field and sort select                    |

  Nothing else: no `h-6`, `h-7`, `py-5` or `py-6` buttons, and no lifted buttons that grow a shadow and move on hover.

- One primary (blue, `default`) button per view: the action the view exists for. Everything else is `outline` or `ghost`.
- Red means the action deletes or overwrites data. A button or menu item that starts such an action is red text (`destructive`); only the button that carries it out, in the final confirm, is solid red (`destructive-confirm`, which ConfirmDialog renders for you). A destructive action is never blue.
- Every icon-only control is an IconButton: it has an accessible name, a tooltip that repeats it, and a hover fill.
- A detail page has one admin control, AdminMenu, in the hero's `adminActions`. A row or card has at most one RowActionsMenu. No clusters of unlabelled admin icons.
- A dialog is a DialogTemplate or a ConfirmDialog: 12px corners, 24px side padding, a header strip with a sentence-case title, a body, a footer strip with the actions on the right, and one backdrop (black at 50%).
- A page form is a PageHeader, then FormPanel with FormSections and FormActions. Notices are Callouts (`@/components/kit/feedback/Callout`).
- Sentence case for every label, title and menu item: "Edit tournament", not "Edit Tournament".
- Button and IconButton have no `'use client'`, so a server page can render them, for example drawn on a `Link` with `asChild`. AdminMenu, RowActionsMenu, ActionMenu, DialogTemplate and ConfirmDialog are client components, and menu actions hold functions and icon components, so build a menu and its dialogs inside a client component (the entity's admin view), never in a server page such as `app/tournaments/[id]/page.tsx`.

Gallery anchor: `/admin/design#controls`

## Button

The site's text button. It wraps the shadcn Button with the three sizes, adds the hover fill that shadcn's ghost lacks, a quiet red for destructive actions, a dark pill for cover art, and a `pending` state.

```tsx
import { Button } from '@/components/kit/controls/Button';

<Button type="submit" pending={saving}>
  {saving ? 'Saving…' : 'Save changes'}
</Button>;

<Button variant="destructive" icon={Trash2}>
  Delete tournament
</Button>;

<Button asChild variant="outline" icon={ExternalLink}>
  <Link href="/docs">Acceptance criteria</Link>
</Button>;
```

Props:

- `size`: `sm`, `default` or `lg` (see the table above).
- `variant`: see below.
- `icon`: a leading lucide icon, 16px. With `asChild` it still renders inside the child.
- `pending`: swaps the icon for a spinner, disables the button and sets `aria-busy`. Change the label too ("Saving…").
- `type`: defaults to `"button"`, so Cancel never submits a form by accident. Pass `type="submit"` on the submit button.
- `asChild`: draws the button on its child, such as a `Link` or `a`.

Variants:

| Variant               | Looks like                      | Use                                                                   |
| --------------------- | ------------------------------- | --------------------------------------------------------------------- |
| `default`             | Solid blue                      | The one primary action of a form, dialog or page                      |
| `outline`             | Bordered                        | Secondary actions: Cancel, Back, Clear, a page's second action        |
| `ghost`               | Text, fills on hover            | Quiet actions inside a panel: Clear all, Show more                    |
| `destructive`         | Red text and border, no fill    | Starts an action that deletes or overwrites data; it opens a confirm  |
| `destructive-confirm` | Solid red (`destructive-solid`) | Only the final confirm in a dialog (ConfirmDialog already renders it) |
| `overlay`             | Dark pill, white in both themes | Only on cover art, like the beatmap hero's preview button             |

Do:

- Keep the primary last in a row of buttons (right on desktop, top when they stack on phones).
- Name the action: "Delete tournament", "Save changes", "Submit tournament". Never "OK", "Yes" or "Confirm".

Don't:

- Don't import `Button` from `@/components/ui/button` in new UI. Its `ghost` has `hover:bg-none`, so pages bolt on their own fills (`hover:bg-black/15 … dark:hover:bg-white/20` in `components/audit/AuditButton.tsx`, `components/tournaments/TournamentAdminView.tsx`, `app/tournaments/[id]/page.tsx`).
- Don't use the large lifted buttons (`py-5 sm:py-6 text-base sm:text-lg shadow-lg hover:-translate-y-0.5`) in `components/tournaments/TournamentSubmissionForm.tsx` and `components/filtering/FilteringForm.tsx`; a form's buttons are `default` size in FormActions.
- Don't use `variant="secondary"` (the grey Clear in `TournamentAdminView.tsx`, Reset in `FilteringForm.tsx`); use `outline`.
- Don't make a trigger solid red (`components/shared/DeleteButton.tsx`, `app/settings/AccountDeletionClient.tsx`) or blue (`components/tournaments/ResetAutomatedChecksButton.tsx`). Use `destructive`, or an AdminMenu item.
- Don't recolour `AlertDialogAction` with `bg-destructive text-white` (`TournamentSubmissionForm.tsx`, `AccountDeletionClient.tsx`); use ConfirmDialog.
- Don't put white text on `bg-destructive`. Dark mode's `--destructive` (red-500) gives white 14px text only about 3.8:1, so `destructive-confirm` fills with `bg-destructive-solid` (`hover:bg-destructive-solid/90`): red-600 in dark mode and the usual destructive red in light. Any other solid red fill behind white text, such as shadcn's own `variant="destructive"` in `components/ui/button.tsx`, needs the same token.
- Don't hand-roll a spinner (`<Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...`); use `pending`.

Gallery anchors: `/admin/design#controls-button-sizes`, `/admin/design#controls-button-variants`

## IconButton

The one icon-only button: a square (round on art) with a hover fill, an `aria-label`, and a tooltip that repeats it. It supersedes `iconButtonStyle` in `components/buttons/IconButton.tsx`, which only styled the glyph and left the hit area, hover and name to each caller.

```tsx
import { IconButton } from '@/components/kit/controls/IconButton';

<IconButton label="Refresh matches" icon={RefreshCw} onClick={refresh} />;

<IconButton asChild label="Audit history" icon={History}>
  <Link href={`/audit/tournaments/${id}`} />
</IconButton>;

<DialogTrigger asChild>
  <IconButton label="Edit note" icon={PencilLine} />
</DialogTrigger>;
```

Props:

- `label`: required. The accessible name and the tooltip, in sentence case.
- `icon`: the lucide glyph. With `asChild` it is placed inside the child element.
- `tooltip`: tooltip text when it should differ from `label` (RowActionsMenu uses it to keep the tooltip short while the name says which row).
- `size`: `sm` (32px, the default), `default` (36px), `lg` (40px), matching the button heights.
- `variant`: `ghost` (default) muted icon that fills on hover; `outline` bordered, beside inputs and outline buttons; `overlay` the round dark pill on cover art.
- `destructive`: red icon and red fill on hover, for a single destructive action outside a menu, such as deleting one admin note. Ignored on `overlay`.

Do:

- Put it inside `DialogTrigger`, `PopoverTrigger` or `DropdownMenuTrigger` with `asChild`. The tooltip lives inside IconButton, so this is the "tooltip wraps the trigger" rule already done.
- Use `ghost` in section header strips, rows and dialog headers, and `outline` next to inputs.

Don't:

- Don't wrap `<Button variant="ghost" size="icon" className="h-6 w-6 …">` in `SimpleTooltip` by hand (`components/audit/AuditButton.tsx`, `components/games/GameCardHeader.tsx`, `components/admin-notes/AdminNoteView.tsx`, `components/reports/ReportButton.tsx`). Those are 24px targets with home-made hover fills.
- Don't put `iconButtonStyle()` on a bare glyph (`components/buttons/DocsButton.tsx`, `SpecButton.tsx`, `SupportButton.tsx`), and don't turn the icon blue on hover (`hover:text-primary` in `DocsButton.tsx`).
- Don't rely on the tooltip of a disabled IconButton: a disabled button gets no pointer events. Say why it is disabled somewhere visible, such as an AdminMenu item's `description`.

Gallery anchor: `/admin/design#controls-icon-button`

## AdminMenu

The one admin control on a detail page: an outline "Admin" button with a muted shield, in the hero's `adminActions` slot, that opens every admin action for the entity as a labelled list. Destructive items sit last, after a separator, in red. Render it only for admins.

```tsx
import { AdminMenu } from '@/components/kit/controls/AdminMenu';
import { ConfirmDialog } from '@/components/kit/controls/ConfirmDialog';

const [editing, setEditing] = useState(false);
const [deleting, setDeleting] = useState(false);

<DetailHero
  title={tournament.name}
  adminActions={
    isAdmin && (
      <AdminMenu
        title={tournament.name}
        notification={notes.length > 0 ? 'Has admin notes' : undefined}
        actions={[
          { label: 'Edit tournament', icon: PencilLine, onSelect: () => setEditing(true) },
          { label: 'Admin notes', icon: NotebookPen, trailing: <Badge size="sm">{formatBadgeCount(notes.length)}</Badge>, onSelect: openNotes },
          { label: 'Reset automated checks', icon: RotateCcw, group: 'data', onSelect: () => setResetting(true) },
          { label: 'Refetch match data', icon: RefreshCw, group: 'data', onSelect: () => setRefetching(true) },
          { label: 'Delete tournament', icon: Trash2, destructive: true, onSelect: () => setDeleting(true) },
        ]}
      />
    )
  }
  actions={
    <IconButton asChild variant="outline" label="Audit history" icon={History}>
      <Link href={`/audit/tournaments/${tournament.id}`} />
    </IconButton>
  }
/>
<TournamentEditDialog open={editing} onOpenChange={setEditing} />
<ConfirmDialog open={deleting} onOpenChange={setDeleting} … />
```

Props:

- `actions`: MenuActions (see [ActionMenu and MenuAction](#actionmenu-and-menuaction)). Falsy entries are skipped, so `isLazer && { … }` works. With no visible actions the menu renders nothing.
- `title`: a muted line at the top of the menu, usually the entity's name.
- `notification`: shows the one notification dot on the button; the string is its screen-reader text ("Has admin notes").
- `onArt`: the dark pill, for a hero with cover art.
- `data-testid`: on the button; the menu content gets `{testid}-content`.

How dialogs open: render each dialog next to the menu, controlled by state, and open it from the item's `onSelect`. The menu runs `onSelect` after it has closed and focus is back on the Admin button, and DialogTemplate and ConfirmDialog return focus there when they close. Never nest a `Dialog` inside a menu item.

Do:

- Label every item with a verb and the noun: "Edit tournament", "Refetch match data", "Delete pooled beatmaps".
- Group with `group`: edit and notes first, then data operations, then (automatically) the destructive group.
- Keep public actions (report, open on osu!, audio preview, audit history) in the hero's `actions`, not in the admin menu.

Don't:

- Don't build a row of admin icons in different colours (`app/tournaments/[id]/page.tsx`: AuditButton, AdminNoteView, TournamentAdminView; `components/matches/MatchCard.tsx`; the pill cluster in `components/beatmap/BeatmapAdminView.tsx`).
- Don't hide operations inside an edit dialog's button bar (the Accept, Reset, Refetch and Delete icons in `TournamentAdminView.tsx`); each becomes a menu item with its own ConfirmDialog.
- Don't colour admin items or their icons; icons are muted, only destructive items are red.
- Don't put audit history in the admin menu or behind an admin check. Audit pages are public; the link belongs in the hero's `actions` for everyone. Only tournaments, matches, games and scores link to one.

Gallery anchors: `/admin/design#controls-admin-menu`, `/admin/design#controls-on-art`

## RowActionsMenu

The overflow menu at the end of a row or card: one "…" IconButton in place of a cluster of icons, such as on each game and score of a match page. Its items work exactly like AdminMenu's.

```tsx
import { RowActionsMenu } from '@/components/kit/controls/RowActionsMenu';

<RowListItem
  title={<Link href={`/beatmaps/${game.beatmap.osuId}`}>{beatmapLabel}</Link>}
  trailing={
    <RowActionsMenu
      itemName={beatmapLabel}
      actions={[
        {
          label: 'Report a problem',
          icon: Flag,
          onSelect: () => setReporting(true),
        },
        {
          label: 'Audit history',
          icon: History,
          href: `/audit/games/${game.id}`,
        },
        isAdmin && {
          label: 'Edit game',
          icon: PencilLine,
          onSelect: () => setEditing(true),
        },
        isAdmin && {
          label: 'Delete game',
          icon: Trash2,
          destructive: true,
          onSelect: () => setDeleting(true),
        },
      ]}
    />
  }
/>;
```

Props:

- `actions`: as AdminMenu.
- `itemName`: what the row is. It names the button for screen readers ("Actions for Hidden Chamber [Insane]") and heads the menu. Always set it in a list, or every button is just "Actions".
- `label`: the tooltip, "Actions" by default.
- Public items (report, audit history) are for everyone; gate only the admin items with `isAdmin &&`. With every admin item hidden, the menu still holds the public ones.
- `onArt`: the round dark pill, for a card header on cover art (`components/games/GameCardHeader.tsx`).
- `size`: `sm` (default) or `default`.

Don't:

- Don't repeat a cluster of external-link, report, audit, notes and edit icons on every card (`components/games/GameCardHeader.tsx`, `components/games/ScoreCard.tsx`).
- Don't put it inside a whole-row link; a linked row holds no other button.

Gallery anchors: `/admin/design#controls-row-actions-menu`, `/admin/design#controls-on-art`

## ActionMenu and MenuAction

AdminMenu and RowActionsMenu are ActionMenu with a fixed trigger. Use ActionMenu directly only for a different trigger.

```tsx
import {
  ActionMenu,
  type MenuAction,
} from '@/components/kit/controls/ActionMenu';

<ActionMenu
  trigger={
    <Button variant="outline" size="sm">
      More
    </Button>
  }
  actions={actions}
/>;
```

MenuAction fields:

- `label` (required), `icon` (muted, red on a destructive item).
- `onSelect`: runs after the menu has closed and focus has returned to the trigger.
- `href`: makes the item a link (`next/link`, not prefetched). `external` opens it in a new tab with an external-link glyph and "(opens in a new tab)" for screen readers.
- `destructive`: red, and moved into the last group.
- `disabled` with `description`: a muted second line that says why, such as "Only beatmaps the osu! API no longer serves". The label and icon dim; the description keeps full contrast so it stays readable.
- `trailing`: a count `Badge` or a `NotificationDot` on the right.
- `group`: items with the same group sit together between separators, in order of first appearance.
- `hidden`: leaves the item out. `id`: the React key when two items share a label. `testId`.

`groupMenuActions(actions)` in `@/lib/kit/controls/menu` does the grouping (unit-tested): groups by first appearance, destructive last, hidden and falsy entries dropped.

## DialogTemplate

Every dialog that is not a confirmation: edit forms, report forms, report details, admin notes, merge pickers. A header strip with the title and a close button, a body that scrolls, and a footer strip with the actions on the right.

```tsx
import { DialogTemplate } from '@/components/kit/controls/DialogTemplate';
import { Form } from '@/components/ui/form';

<Form {...form}>
  <DialogTemplate
    open={open}
    onOpenChange={setOpen}
    title="Edit tournament"
    description="Changes apply on the next rating run."
    size="lg"
    onSubmit={form.handleSubmit(save)}
    footer={
      <>
        <Button variant="outline" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button type="submit" pending={form.formState.isSubmitting}>
          Save changes
        </Button>
      </>
    }
  >
    <FormField … />
  </DialogTemplate>
</Form>;
```

Props:

- `open`, `defaultOpen`, `onOpenChange`: as Radix Dialog. Omit `open` and pass `trigger` for a self-contained dialog.
- `trigger`: the button that opens it, wrapped in `DialogTrigger`. Leave it out when an AdminMenu item opens the dialog.
- `title`: sentence case, 16px semibold. `description`: one or two muted sentences under it.
- `children`: the body, 24px padding, children 16px apart. It scrolls when the dialog is taller than the screen; the header and footer stay.
- `footer`: the actions, right-aligned, primary last. `footerStart`: muted text or a quiet action on the left ("Last edited Oct 14, 2026").
- `notice`: a Callout or error line above the actions that must stay in view, such as "Saving is permanent" in the beatmap edit dialog.
- `size`: `sm` 448px, `md` 512px (default), `lg` 672px for long forms.
- `onSubmit`: makes the body and footer one `<form>`, so a `type="submit"` button in `footer` submits it and Enter in a field works.
- `closable`: `false` hides the close button and ignores clicks outside. Escape still closes, so guard unsaved changes in `onOpenChange`.

Anatomy, shared with ConfirmDialog through `DIALOG_CLASSES`: header `border-b px-6 py-4`, body `p-6`, footer `border-t bg-muted/30 px-6 py-4`, surface `rounded-xl border bg-background shadow-lg`, backdrop `bg-black/50`. The close button is last in the DOM, so keyboard focus starts on the first field, and is drawn in the header's corner.

Do:

- Ask before discarding edits: open a ConfirmDialog ("Discard your changes?") from `onOpenChange` when the form is dirty.
- Keep one dialog per task. A multi-step flow (edit, then confirm the edit) swaps the footer's buttons rather than opening a second dialog. The one dialog that may open on top of another is the discard confirmation above.

Don't:

- Don't pad `DialogContent` yourself (`className="p-4"` in `TournamentAdminView.tsx`, `AdminNoteView.tsx`, `MatchAdminView.tsx`) or build your own strips (`px-5` in `BeatmapAdminView.tsx`).
- Don't use Title Case ("Report Details" in `app/reports/MyReportsClient.tsx`) or prefix titles with "Confirm" ("Confirm delete tournament" in `DeleteButton.tsx`, "Confirm match data refetch" in `RefetchMatchDataButton.tsx`).
- Don't use the shadcn `DialogContent` directly in new UI; its backdrop is 80% black while AlertDialog's is 50%.

Gallery anchor: `/admin/design#controls-dialog-template`

## ConfirmDialog

Confirms one consequential action before it runs: delete, reset, refetch, merge, discard. Built on AlertDialog, so it cannot be dismissed by clicking outside, and Cancel takes the initial focus. Its confirm button is the only solid red button on the site.

```tsx
import { ConfirmDialog } from '@/components/kit/controls/ConfirmDialog';

<ConfirmDialog
  open={deleting}
  onOpenChange={setDeleting}
  title="Delete this tournament?"
  description={
    <>
      <p>
        This deletes <strong>{tournament.name}</strong> with its{' '}
        {formatCount(matchCount)} matches, {formatCount(gameCount)} games and{' '}
        {formatCount(scoreCount)} scores.
      </p>
      <p>This cannot be undone.</p>
    </>
  }
  confirmLabel="Delete tournament"
  pendingLabel="Deleting…"
  onConfirm={async () => {
    await orpc.tournaments.admin.delete({ id: tournament.id });
    toast.success('Tournament deleted');
    router.push('/tournaments');
  }}
/>;
```

Props:

- `title`: a question in sentence case: "Delete this tournament?", "Reset automated checks?", "Discard your changes?".
- `description`: what happens, what it reaches (with counts), and whether it can be undone. Paragraphs, not `<br />`.
- `children`: options under the description, such as a checkbox ("Also reset verified and rejected data").
- `confirmLabel`: verb and noun, matching the action that opened it. `pendingLabel`: shown with a spinner while `onConfirm` runs. `cancelLabel`: "Cancel" by default ("Keep editing" for a discard).
- `onConfirm`: return a promise and the dialog stays open with a spinner (Cancel and Escape disabled) until it settles. It closes when the promise resolves; when it rejects, it stays open and shows `errorText` ("Something went wrong. Try again." by default). Show your own success toast inside `onConfirm`.
- `tone`: `destructive` (default, solid red confirm) for anything that deletes or overwrites data; `default` (blue) for a consequential action that loses nothing, such as queueing a refetch or continuing without beatmaps.
- `trigger`: for a self-contained confirm; otherwise control it with `open` from an AdminMenu item.
- `confirmDisabled`: holds the confirm button until a required option is set.

Don't:

- Don't write "Are you sure you want to …?" with bullet lists of side effects (`components/shared/DeleteButton.tsx`, `components/tournaments/ResetAutomatedChecksButton.tsx`); say what happens in plain sentences.
- Don't label the confirm "Confirm", "OK" or "Continue".
- Don't use a plain `Dialog` for a confirmation (`DeleteButton.tsx`, `RefetchMatchDataButton.tsx`, `DeleteTournamentBeatmapsButton.tsx`, the merge confirms in `MergeGameButton.tsx` and `MergeMatchButton.tsx`).

Gallery anchor: `/admin/design#controls-confirm-dialog`

## FormPanel, FormSection, FormGrid and FormActions

The layout of a page form, such as tournament submission or registrant filtering: the standard PageHeader, any page notice as a Callout, then one panel holding the form. Sections are split by section header strips, and the actions sit in a strip at the bottom right.

```tsx
import {
  FormActions,
  FormGrid,
  FormPanel,
  FormSection,
} from '@/components/kit/controls/FormPanel';
import { Callout } from '@/components/kit/feedback/Callout';
import { PageFrame } from '@/components/kit/layout/PageFrame';
import { PageHeader } from '@/components/kit/layout/PageHeader';
import { Form } from '@/components/ui/form';

<PageFrame>
  <PageHeader
    icon={Trophy}
    title="Submit a tournament"
    description="Add a tournament's matches so they can be verified and rated."
  />
  <Callout tone="info" title="Before you submit">
    …
  </Callout>
  <Form {...form}>
    <FormPanel onSubmit={form.handleSubmit(submit)} data-testid="tournament-submission-form">
      <FormSection icon={Trophy} title="Tournament">
        <FormGrid>
          <FormField … />
          <FormField … />
        </FormGrid>
        <FormField … />
      </FormSection>
      <FormSection icon={Database} title="Data" description="Paste osu! links or IDs, one per line.">
        …
      </FormSection>
      <FormActions start="An admin reviews every submission before it counts.">
        <Button variant="outline" onClick={() => form.reset()}>Clear</Button>
        <Button type="submit" pending={submitting}>Submit tournament</Button>
      </FormActions>
    </FormPanel>
  </Form>
</PageFrame>;
```

Parts:

- FormPanel: a Panel holding the `<form>`. Props other than `panelClassName` go to the form (`onSubmit`, `noValidate`, `data-testid`). It renders no `Form` provider; wrap it in shadcn's `Form` for react-hook-form.
- FormSection: a group (`role="group"`, named by its title) with a SectionHeader strip and the fields 16px apart in 16px padding. Takes `icon` (muted), `title`, `level`, `description` (one muted line above the fields), `infoText` and `actions` (passed to the strip), `bodyClassName`. Sections after the first get a divider.
- FormGrid: fields side by side, one column on phones. `columns` 2 (default), 3 or 4; 4 is for short fields such as a rank range and keeps two columns on phones. Fields align to the top, so an error under one does not shift its neighbour.
- FormActions: the bottom strip. `default`-size buttons on the right with the primary last; `start` holds a muted note on the left. On phones the buttons stack full width with the primary on top.

Notices: a page-level notice is a Callout between the PageHeader and the panel; a notice about one section is a Callout at the top of that FormSection; a field's help is its FormFieldLabel `info` or a `FormDescription`; errors are `FormMessage`.

Do:

- Use the shadcn `Input`, `Textarea`, `Select` and `Checkbox` as they are.

Don't:

- Don't centre a blue title above the form (`app/tournaments/submit/page.tsx`) or stack a padded Card inside the page (`TournamentSubmissionForm.tsx`, `FilteringForm.tsx` with `px-4 py-4 sm:px-6 sm:py-6 lg:px-8`).
- Don't hand-build section headings with `size-6 text-primary` icons and `text-lg sm:text-xl` titles (the local `FormSection` in both forms); FormSection uses the standard strip.
- Don't restyle inputs (`border-2 shadow-sm bg-card focus-visible:ring-primary` from `getFieldClassName` in `TournamentSubmissionForm.tsx`, the same classes in `FilteringForm.tsx`).
- Don't build notices from palette classes (`border-orange-500/50 bg-orange-500/15` in `app/tools/filter/FilteringPageClient.tsx`, the warning-yellow `Alert` above it); use Callout.

Gallery anchor: `/admin/design#controls-form-layout`

## FormFieldLabel

A field label inside a shadcn `FormItem`, with the one info button for help and an optional muted hint on the right ("Optional", "One per line", a unit).

```tsx
import { FormFieldLabel } from '@/components/kit/controls/FormFieldLabel';

<FormItem>
  <FormFieldLabel
    info="The prefix of each lobby, such as OWC2024."
    hint="Required"
  >
    Abbreviation
  </FormFieldLabel>
  <FormControl>
    <Input {...field} />
  </FormControl>
  <FormMessage />
</FormItem>;
```

Props:

- `children`: the label text, sentence case. It turns red with the field's error, from `FormLabel`.
- `info`: the explanation behind an InfoButton (its `md` size, the one beside 14px text), which opens on tap, hover and focus. `infoLabel` names it; it defaults to "About {label}".
- `hint`: muted text on the right.

The label row is 20px tall with or without the info button or hint, so fields side by side in a FormGrid keep their inputs level.

Don't:

- Don't use `LabelWithTooltip` (`components/ui/LabelWithTooltip.tsx`, a circled "?") or the local `FieldLabel` with `hint` and the hover-only info tooltips in `components/beatmap/BeatmapAdminView.tsx`.
- Don't mix FormFieldLabel and a bare `FormLabel` in one FormGrid row; the bare label is shorter and its input sits 6px higher.

Gallery anchors: `/admin/design#controls-form-field-label`, `/admin/design#controls-form-layout`
