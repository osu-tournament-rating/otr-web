'use client';

import { ReportEntityType } from '@otr/core/osu';
import { Flag } from 'lucide-react';

import {
  IconButton,
  type IconButtonProps,
} from '@/components/kit/controls/IconButton';

import { ReportDialog } from './ReportDialog';
import { getReportEntityTypeName } from './report-presentation';

export { ReportDialog, type ReportDialogProps } from './ReportDialog';

interface ReportButtonProps {
  entityType: ReportEntityType;
  entityId: number;
  entityDisplayName: string;
  /** `outline` beside other outline controls, such as a hero's public actions. */
  variant?: IconButtonProps['variant'];
  size?: IconButtonProps['size'];
  /** @deprecated On cover art, pass `variant="overlay"`. */
  darkMode?: boolean;
}

/**
 * The public "Report an issue" flag button with its report dialog, for a
 * hero's public actions. Inside an AdminMenu or RowActionsMenu, add a
 * "Report an issue" item instead and open `ReportDialog` from it.
 * Signed-in visitors only; it renders nothing for everyone else.
 */
export default function ReportButton({
  entityType,
  entityId,
  entityDisplayName,
  variant,
  size,
  darkMode = false,
}: ReportButtonProps) {
  return (
    <ReportDialog
      entityType={entityType}
      entityId={entityId}
      entityDisplayName={entityDisplayName}
      trigger={
        <IconButton
          icon={Flag}
          label={`Report an issue with ${entityDisplayName} (${getReportEntityTypeName(entityType)})`}
          tooltip="Report an issue"
          variant={variant ?? (darkMode ? 'overlay' : 'ghost')}
          size={size}
          data-testid="report-button"
          data-entity-type={entityType}
          data-entity-id={entityId}
        />
      }
    />
  );
}
