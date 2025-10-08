'use client';

import { Copy, KeyRound, Loader2, Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ApiKeyMetadataWithKey } from '@/lib/orpc/schema/apiKey';
import { orpc } from '@/lib/orpc/orpc';

interface ApiKeySettingsClientProps {
  initialKeys: ApiKeyMetadataWithKey[];
  rateLimit: {
    maxRequests: number;
    timeWindowMs: number;
  };
}

const MAX_API_KEYS = 3;
const FALLBACK_KEY_NAME = 'API key';

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

const getKeyName = (metadata: ApiKeyMetadataWithKey) =>
  metadata.name && metadata.name.trim().length > 0
    ? metadata.name.trim()
    : FALLBACK_KEY_NAME;

const calculateRequestsPerMinute = (
  maxRequests: number | null,
  timeWindowMs: number | null,
  fallbackMax: number,
  fallbackWindowMs: number
) => {
  const effectiveMax = maxRequests ?? fallbackMax;
  const effectiveWindow = timeWindowMs ?? fallbackWindowMs;

  if (!effectiveMax || !effectiveWindow) {
    return null;
  }

  const perMinute = Math.round((effectiveMax * 60000) / effectiveWindow);
  return perMinute > 0 ? perMinute : 1;
};

export default function ApiKeySettingsClient({
  initialKeys,
  rateLimit,
}: ApiKeySettingsClientProps) {
  const [keys, setKeys] = useState<ApiKeyMetadataWithKey[]>(initialKeys);
  const [pendingName, setPendingName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [confirmingKeyId, setConfirmingKeyId] = useState<string | null>(null);

  const sortedKeys = useMemo(
    () =>
      [...keys].sort((a, b) => {
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        return bTime - aTime;
      }),
    [keys]
  );

  const remainingSlots = Math.max(MAX_API_KEYS - keys.length, 0);

  const handleGenerate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (keys.length >= MAX_API_KEYS) {
      const message = `You can create up to ${MAX_API_KEYS} API keys. Remove an existing key before creating another.`;
      setError(message);
      toast.error(message);
      return;
    }

    const trimmedName = pendingName.trim();
    if (trimmedName.length === 0) {
      const message = 'Enter a descriptive name for this API key.';
      setError(message);
      toast.error(message);
      return;
    }

    setError(null);
    setIsGenerating(true);

    try {
      const result = await orpc.apiClients.generateKey({
        name: trimmedName,
      });
      const metadata: ApiKeyMetadataWithKey = result;

      setKeys((previous) => {
        const withoutDuplicate = previous.filter(
          (existing) => existing.id !== metadata.id
        );
        return [...withoutDuplicate, metadata];
      });

      setPendingName('');
      toast.success('API key generated successfully');
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to generate an API key. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopySecret = (value: string) => {
    navigator.clipboard
      .writeText(value)
      .then(() => toast.success('API key copied to clipboard'))
      .catch(() => toast.error('Failed to copy API key.'));
  };

  const handleDeleteKey = async (keyId: string) => {
    setPendingDeleteId(keyId);
    try {
      await orpc.apiClients.deleteKey({ keyId });
      setKeys((previous) => previous.filter((key) => key.id !== keyId));
      toast.success('API key deleted');
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to delete API key. Please try again.';
      toast.error(message);
    } finally {
      setPendingDeleteId(null);
      setConfirmingKeyId(null);
    }
  };

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">API Access</h2>
        <p className="text-muted-foreground text-sm sm:text-base">
          Create and manage API keys for trusted services that integrate with
          osu! Tournament Ratings.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <KeyRound className="text-primary size-6" />
            <div>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Issue up to {MAX_API_KEYS} keys to connect dashboards, bots, or
                other trusted tools.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <form
            className="border-border/50 bg-muted/10 flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-end sm:gap-6"
            onSubmit={handleGenerate}
          >
            <div className="flex-1 space-y-2">
              <Label htmlFor="api-key-name">Key name</Label>
              <Input
                id="api-key-name"
                placeholder='e.g. "My spreadsheet"'
                value={pendingName}
                onChange={(event) => setPendingName(event.target.value)}
                maxLength={100}
                disabled={isGenerating}
                required
              />
            </div>
            <Button type="submit" disabled={isGenerating} className="sm:w-auto">
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate API key'
              )}
            </Button>
          </form>

          {sortedKeys.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Rate limit</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedKeys.map((keyMetadata) => {
                  const requestsPerMinute = calculateRequestsPerMinute(
                    keyMetadata.rateLimitMax,
                    keyMetadata.rateLimitTimeWindow,
                    rateLimit.maxRequests,
                    rateLimit.timeWindowMs
                  );

                  return (
                    <TableRow key={keyMetadata.id}>
                      <TableCell className="font-medium">
                        {getKeyName(keyMetadata)}
                      </TableCell>
                      <TableCell>
                        {requestsPerMinute
                          ? `${requestsPerMinute} requests per minute`
                          : 'Not rate limited'}
                      </TableCell>
                      <TableCell>
                        {formatDateTime(keyMetadata.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="hover:bg-primary/10"
                            onClick={() => handleCopySecret(keyMetadata.key)}
                          >
                            <Copy className="size-4" />
                            <span className="sr-only">Copy API key</span>
                          </Button>
                          <AlertDialog
                            open={confirmingKeyId === keyMetadata.id}
                            onOpenChange={(open) =>
                              setConfirmingKeyId(open ? keyMetadata.id : null)
                            }
                          >
                            <AlertDialogTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="hover:bg-destructive/10 text-destructive"
                                onClick={() =>
                                  setConfirmingKeyId(keyMetadata.id)
                                }
                                disabled={pendingDeleteId === keyMetadata.id}
                              >
                                <Trash2 className="size-4" />
                                <span className="sr-only">Delete API key</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Delete &quot;{getKeyName(keyMetadata)}&quot;?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will immediately revoke access for any
                                  integration using this key.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel
                                  onClick={() => setConfirmingKeyId(null)}
                                >
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleDeleteKey(keyMetadata.id)
                                  }
                                  className="bg-destructive hover:bg-destructive/90 focus-visible:ring-destructive/40 text-white"
                                  disabled={pendingDeleteId === keyMetadata.id}
                                >
                                  {pendingDeleteId === keyMetadata.id
                                    ? 'Deleting...'
                                    : 'Delete key'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="border-border/60 text-muted-foreground flex flex-col items-start gap-2 rounded-xl border p-6 text-sm">
              <span>No API keys yet.</span>
              <span>
                Generate a key to connect external dashboards or automation
                tools to the o!TR API.
              </span>
            </div>
          )}

          {sortedKeys.length > 0 && (
            <div className="border-border/60 bg-muted/10 text-muted-foreground rounded-xl border p-4 text-sm">
              Include your key via{' '}
              <span className="font-medium">
                `Authorization: Bearer &lt;key&gt;`
              </span>{' '}
              when making API calls.
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-muted-foreground text-sm">
            Remember to rotate keys regularly and remove any integrations you no
            longer use.
          </span>
          <span className="text-sm font-medium">
            {remainingSlots} of {MAX_API_KEYS} slots available
          </span>
        </CardFooter>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </section>
  );
}
