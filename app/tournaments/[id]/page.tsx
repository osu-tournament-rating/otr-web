import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { tournaments } from '@/lib/api';
import { rulesetString } from '@/lib/utils';
import type { Metadata } from 'next';

type PageProps = { params: Promise<{ id: number }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { result } = await tournaments.get({
    id: (await params).id,
    verified: false
  });

  return {
    title: result.name,
  };
}

export default async function Page({ params }: PageProps) {
  const { result } = await tournaments.get({
    id: (await params).id,
    verified: false,
  });

  return (
    <Card>
        <CardHeader>
            <CardTitle className='flex gap-2'>{<p className='text-secondary'>{result.abbreviation}</p>} {result.name}</CardTitle>
            <CardDescription className='font-mono'>
            {result.abbreviation} • {rulesetString(result.ruleset)} • {result.lobbySize}v{result.lobbySize} • #{result.rankRangeLowerBound}+
            </CardDescription>
        </CardHeader>
    </Card>
  );
}
