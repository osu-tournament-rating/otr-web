import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Settings, ShieldCheck } from 'lucide-react';

import ApiKeySettingsClient from '@/app/settings/ApiKeySettingsClient';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { auth } from '@/lib/auth/auth';
import { mapAppSessionToUser } from '@/lib/auth/session-utils';
import { orpc } from '@/lib/orpc/orpc';

export default async function SettingsPage() {
  const headersList = await headers();
  const appSession = await auth.api.getSession({ headers: headersList });

  if (!appSession) {
    redirect('/unauthorized');
  }

  const sessionUser = mapAppSessionToUser(appSession);
  const scopes = sessionUser?.scopes ?? [];
  const keys = await orpc.apiClients.getKeys();

  return (
    <div className="flex flex-col gap-10">
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <Settings className="text-primary size-6" />
          <div>
            <h1 className="text-3xl font-semibold">Settings</h1>
          </div>
        </div>
      </header>

      <div className="space-y-8">
        <Card>
          <CardHeader className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-primary size-6" />
              <div>
                <CardTitle>Permissions</CardTitle>
                <CardDescription>
                  Scopes determine which admin tools you can use.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Scopes
              </p>
              {scopes.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {scopes.map((scope) => (
                    <Badge key={scope} variant="secondary">
                      {scope}
                    </Badge>
                  ))}
                </div>
              ) : (
                <Badge variant="outline">user</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <ApiKeySettingsClient
          initialKeys={keys}
          rateLimit={{ maxRequests: 60, timeWindowMs: 60_000 }}
        />
      </div>
    </div>
  );
}
