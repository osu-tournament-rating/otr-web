import { EnumMetadata, IEnumHelper } from '@/lib/enum-helpers';
import { SelectContent, SelectItem } from '../ui/select';

export default function SimpleSelectContent<
  T extends number,
  M extends EnumMetadata = EnumMetadata,
>({ enumHelper }: { enumHelper: IEnumHelper<T, M> }) {
  return (
    <SelectContent>
      {/* @ts-expect-error We love generic types */}
      {Object.entries(enumHelper.metadata).map(([k, { text }]) => (
        <SelectItem key={`item-${k}`} value={k}>
          {text}
        </SelectItem>
      ))}
    </SelectContent>
  );
}
