import { VerificationStatusEnumHelper } from '@/lib/enum-helpers';
import { SelectContent, SelectItem } from '../ui/select';

export default function VerificationStatusSelectContent() {
  return (
    <SelectContent>
      {Object.entries(VerificationStatusEnumHelper.metadata).map(
        ([k, { text }]) => (
          <SelectItem key={`verificationStatus-${k}`} value={k}>
            {text}
          </SelectItem>
        )
      )}
    </SelectContent>
  );
}
