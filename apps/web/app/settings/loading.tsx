import {
  ApiKeysPanelSkeleton,
  DangerZonePanelSkeleton,
  FriendsPanelSkeleton,
  SettingsFrame,
  ShortcutsPanelSkeleton,
} from './SettingsFrame';

export default function SettingsLoading() {
  return (
    <SettingsFrame>
      <FriendsPanelSkeleton label="Loading settings" />
      <ApiKeysPanelSkeleton />
      <ShortcutsPanelSkeleton />
      <DangerZonePanelSkeleton />
    </SettingsFrame>
  );
}
