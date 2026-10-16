'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import * as React from 'react';

import { IconButton } from '@/components/kit/controls/IconButton';
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/**
 * The one dialog anatomy, shared by DialogTemplate and ConfirmDialog: a
 * header strip, a body that scrolls, and a footer strip with the actions on
 * the right. 12px corners, 24px side padding, one backdrop.
 */
export const DIALOG_CLASSES = {
  backdrop: 'bg-black/50',
  position:
    'fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 outline-none duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
  surface:
    'flex flex-col overflow-hidden rounded-xl border bg-background text-foreground shadow-lg',
  header: 'flex shrink-0 flex-col gap-1.5 border-b px-6 py-4',
  title: 'text-base leading-6 font-semibold',
  description: 'text-sm text-muted-foreground',
  body: 'flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6',
  footer: 'flex shrink-0 flex-col gap-3 border-t bg-muted/30 px-6 py-4',
  footerRow:
    'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
  footerStart: 'min-w-0 text-sm text-muted-foreground',
  actions: 'flex flex-col-reverse gap-2 sm:ml-auto sm:flex-row sm:items-center',
} as const;

export type DialogSize = 'sm' | 'md' | 'lg';

/** `sm` 448px for confirmations, `md` 512px, `lg` 672px for long forms. */
export const DIALOG_SIZE_CLASSES: Record<DialogSize, string> = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
};

/**
 * Radix returns focus to a dialog's own trigger, so a dialog opened from a
 * menu item would drop focus onto the page when it closes. These handlers
 * return it to whatever had focus when the dialog opened, such as the menu's
 * trigger. Pass the content's own handlers in to compose them.
 */
export function useReturnFocus({
  onOpenAutoFocus,
  onCloseAutoFocus,
}: {
  onOpenAutoFocus?: (event: Event) => void;
  onCloseAutoFocus?: (event: Event) => void;
} = {}) {
  const returnTo = React.useRef<HTMLElement | null>(null);

  return {
    onOpenAutoFocus: (event: Event) => {
      const active = document.activeElement;
      returnTo.current =
        active instanceof HTMLElement && active !== document.body
          ? active
          : null;
      onOpenAutoFocus?.(event);
    },
    onCloseAutoFocus: (event: Event) => {
      const target = returnTo.current;
      returnTo.current = null;
      onCloseAutoFocus?.(event);

      if (!event.defaultPrevented && target?.isConnected) {
        event.preventDefault();
        target.focus({ preventScroll: true });
      }
    },
  };
}

export type DialogTemplateProps = Omit<
  React.ComponentProps<typeof DialogPrimitive.Content>,
  'title' | 'children'
> & {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The button that opens the dialog. Leave it out when a menu item opens it. */
  trigger?: React.ReactElement;
  /** Sentence case: "Edit tournament". */
  title: React.ReactNode;
  /** One or two sentences under the title. */
  description?: React.ReactNode;
  /** The body. It scrolls when the dialog is taller than the screen. */
  children: React.ReactNode;
  /** The actions, right-aligned with the primary last: Cancel, then Save. */
  footer?: React.ReactNode;
  /** Muted text or a quiet action at the left of the footer. */
  footerStart?: React.ReactNode;
  /** A callout or error above the actions that must stay in view. */
  notice?: React.ReactNode;
  size?: DialogSize;
  /** Makes the body and footer one form, so a submit button in `footer` works. */
  onSubmit?: React.FormEventHandler<HTMLFormElement>;
  /** False hides the close button and ignores clicks outside. Escape still closes. */
  closable?: boolean;
  bodyClassName?: string;
};

/**
 * Every dialog that is not a confirmation: a header strip with the title and
 * a close button, a body, and a footer strip with the actions on the right.
 * Use ConfirmDialog to confirm a single action.
 */
export function DialogTemplate({
  open,
  defaultOpen,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  footer,
  footerStart,
  notice,
  size = 'md',
  onSubmit,
  closable = true,
  className,
  bodyClassName,
  onInteractOutside,
  onOpenAutoFocus,
  onCloseAutoFocus,
  ...props
}: DialogTemplateProps) {
  const focusHandlers = useReturnFocus({ onOpenAutoFocus, onCloseAutoFocus });
  const hasFooter = Boolean(footer || footerStart || notice);
  const main = (
    <>
      <div
        data-slot="dialog-body"
        className={cn(DIALOG_CLASSES.body, bodyClassName)}
      >
        {children}
      </div>
      {hasFooter ? (
        <DialogFooterStrip notice={notice} start={footerStart}>
          {footer}
        </DialogFooterStrip>
      ) : null}
    </>
  );

  return (
    <Dialog open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogPortal>
        <DialogOverlay className={DIALOG_CLASSES.backdrop} />
        <DialogPrimitive.Content
          data-slot="dialog-template"
          // Radix warns when a dialog has neither a description nor this.
          {...(description ? {} : { 'aria-describedby': undefined })}
          className={cn(
            DIALOG_CLASSES.position,
            DIALOG_CLASSES.surface,
            DIALOG_SIZE_CLASSES[size],
            className
          )}
          onInteractOutside={(event) => {
            if (!closable) event.preventDefault();
            onInteractOutside?.(event);
          }}
          {...focusHandlers}
          {...props}
        >
          <div
            data-slot="dialog-header"
            className={cn(DIALOG_CLASSES.header, closable && 'pr-14')}
          >
            <DialogTitle className={DIALOG_CLASSES.title}>{title}</DialogTitle>
            {description ? (
              <DialogDescription className={DIALOG_CLASSES.description}>
                {description}
              </DialogDescription>
            ) : null}
          </div>

          {onSubmit ? (
            <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
              {main}
            </form>
          ) : (
            main
          )}

          {closable ? (
            // Last in the DOM so a keyboard user lands on the first field,
            // drawn in the header's corner.
            <div className="absolute top-3 right-4">
              <DialogClose asChild>
                <IconButton label="Close" icon={X} tooltipSide="left" />
              </DialogClose>
            </div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

/** The footer strip: an optional notice, then muted text left and actions right. */
export function DialogFooterStrip({
  notice,
  start,
  children,
  className,
}: {
  notice?: React.ReactNode;
  start?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(DIALOG_CLASSES.footer, className)}
    >
      {notice}
      {start || children ? (
        <div className={DIALOG_CLASSES.footerRow}>
          {start ? (
            <div className={DIALOG_CLASSES.footerStart}>{start}</div>
          ) : null}
          {children ? (
            <div className={DIALOG_CLASSES.actions}>{children}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
