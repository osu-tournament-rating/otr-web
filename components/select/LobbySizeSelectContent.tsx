import { SelectContent, SelectItem } from '../ui/select';

export default function LobbySizeSelectContent() {
  return (
    <SelectContent>
      {[...Array(8)].map((_, i) => (
        <SelectItem key={`lobbysize-${i + 1}`} value={(i + 1).toString()}>
          {i + 1}v{i + 1}
        </SelectItem>
      ))}
    </SelectContent>
  );
}
