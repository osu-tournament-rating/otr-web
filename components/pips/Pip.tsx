import {
  GameRejectionReason,
  GameWarningFlags,
  VerificationStatus,
} from '@osu-tournament-rating/otr-api-client';
import {
  Circle, // Default, Verified
  Square, // PreVerified
  Triangle, // PreVerified with warnings
  MinusCircle, // Rejected
  AlertTriangle, // PreRejected
  HelpCircle, // Default for unhandled cases
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  GameRejectionReasonEnumHelper,
  GameWarningFlagsEnumHelper,
} from '@/lib/enums';

interface PipProps {
  verificationStatus: VerificationStatus;
  warningFlags: GameWarningFlags;
  rejectionReason: GameRejectionReason;
  gameIndex: number;
}

const Pip = ({
  verificationStatus,
  warningFlags,
  rejectionReason,
  gameIndex,
}: PipProps) => {
  let Icon = HelpCircle;
  let color = 'text-muted';
  const titleText = `Game ${gameIndex + 1}`;
  let statusText = 'Status Unknown';
  const warningMetadata =
    GameWarningFlagsEnumHelper.getMetadata(warningFlags).filter(Boolean);
  const rejectionMetadata =
    GameRejectionReasonEnumHelper.getMetadata(rejectionReason).filter(Boolean);

  const hasWarnings =
    warningFlags !== GameWarningFlags.None && warningMetadata.length > 0;
  const isRejected =
    rejectionReason !== GameRejectionReason.None &&
    rejectionMetadata.length > 0;

  switch (verificationStatus) {
    case VerificationStatus.Verified:
      Icon = Circle;
      color = 'text-success';
      statusText = 'Verified';
      break;
    case VerificationStatus.PreVerified:
      if (hasWarnings) {
        Icon = Triangle;
        color = 'text-warning';
        statusText = 'Pre-verified with warnings';
      } else {
        Icon = Square;
        color = 'text-success';
        statusText = 'Pre-verified';
      }
      break;
    case VerificationStatus.Rejected:
      Icon = MinusCircle;
      color = 'text-destructive';
      statusText = 'Rejected';
      break;
    case VerificationStatus.PreRejected:
      Icon = AlertTriangle;
      color = 'text-warning';
      statusText = 'Pre-rejected';
      break;
    case VerificationStatus.None:
      Icon = Circle;
      color = 'text-muted-foreground';
      statusText = 'Pending';
      break;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Icon className={`h-4 w-4 ${color}`} />
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-bold">{titleText}</p>
          <p>{statusText}</p>
          {isRejected && rejectionMetadata.length > 0 && (
            <div className="mt-1">
              <p className="font-semibold">Rejection Reasons:</p>
              <ul className="list-disc pl-3.5">
                {rejectionMetadata.map(({ text, description }) => (
                  <li key={text}>{text || description}</li>
                ))}
              </ul>
            </div>
          )}
          {hasWarnings && warningMetadata.length > 0 && (
            <div className="mt-1">
              <p className="font-semibold">Warnings:</p>
              <ul className="list-disc pl-3.5">
                {warningMetadata.map(({ text, description }) => (
                  <li key={text}>{text || description}</li>
                ))}
              </ul>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default Pip;
