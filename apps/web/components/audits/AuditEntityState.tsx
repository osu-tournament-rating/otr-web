'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { AlertCircle, ChevronDown, ExternalLink } from 'lucide-react';

import { ReportEntityType } from '@otr/core/osu';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  GameRejectionReasonEnumHelper,
  GameWarningFlagsEnumHelper,
  MatchRejectionReasonEnumHelper,
  MatchWarningFlagsEnumHelper,
  ModsEnumHelper,
  ReportEntityTypeEnumHelper,
  RulesetEnumHelper,
  ScoreGradeEnumHelper,
  ScoreRejectionReasonEnumHelper,
  ScoringTypeEnumHelper,
  TeamEnumHelper,
  TeamTypeEnumHelper,
  TournamentRejectionReasonEnumHelper,
  VerificationStatusEnumHelper,
} from '@/lib/enums';

const HIDDEN_PROPERTIES = new Set(['searchVector']);

const PROPERTY_NAME_OVERRIDES: Record<string, string> = {
  id: 'ID',
  osuId: 'osu! ID',
  pp: 'PP',
  maxCombo: 'Max Combo',
  forumUrl: 'Forum URL',
  isPerfectCombo: 'Is Perfect Combo',
  legacyPerfect: 'Legacy Perfect',
  legacyTotalScore: 'Legacy Total Score',
  statComboBreak: 'Combo Breaks',
  statGreat: 'Great',
  statOk: 'OK',
  statMeh: 'Meh',
  statMiss: 'Miss',
  statGood: 'Good',
  statPerfect: 'Perfect',
  statSliderTailHit: 'Slider Tail Hits',
  statLargeTickHit: 'Large Tick Hits',
  statLargeTickMiss: 'Large Tick Misses',
  statSmallTickHit: 'Small Tick Hits',
  statSmallTickMiss: 'Small Tick Misses',
  statLargeBonus: 'Large Bonus',
  statSmallBonus: 'Small Bonus',
  statIgnoreHit: 'Ignore Hits',
  statIgnoreMiss: 'Ignore Misses',
  statLegacyComboIncrease: 'Legacy Combo Increase',
  isLazer: 'Is Lazer',
  dataFetchStatus: 'Data Fetch Status',
  gameId: 'Game ID',
  playerId: 'Player ID',
  matchId: 'Match ID',
  tournamentId: 'Tournament ID',
  beatmapId: 'Beatmap ID',
  submittedByUserId: 'Submitted By User ID',
  verifiedByUserId: 'Verified By User ID',
};

function formatPropertyName(key: string): string {
  if (PROPERTY_NAME_OVERRIDES[key]) {
    return PROPERTY_NAME_OVERRIDES[key];
  }
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function formatPropertyValue(
  key: string,
  value: unknown,
  entityType: ReportEntityType
): string {
  if (value === null || value === undefined) {
    return '(none)';
  }

  if (key === 'verificationStatus' && typeof value === 'number') {
    return (
      VerificationStatusEnumHelper.getMetadata(value)?.text ?? String(value)
    );
  }

  if (key === 'rejectionReason' && typeof value === 'number') {
    if (value === 0) return '(none)';
    switch (entityType) {
      case ReportEntityType.Tournament:
        return (
          TournamentRejectionReasonEnumHelper.getMetadata(value)
            .map((m) => m.text)
            .join(', ') || String(value)
        );
      case ReportEntityType.Match:
        return (
          MatchRejectionReasonEnumHelper.getMetadata(value)
            .map((m) => m.text)
            .join(', ') || String(value)
        );
      case ReportEntityType.Game:
        return (
          GameRejectionReasonEnumHelper.getMetadata(value)
            .map((m) => m.text)
            .join(', ') || String(value)
        );
      case ReportEntityType.Score:
        return (
          ScoreRejectionReasonEnumHelper.getMetadata(value)
            .map((m) => m.text)
            .join(', ') || String(value)
        );
      default:
        return String(value);
    }
  }

  if (key === 'warningFlags' && typeof value === 'number') {
    if (value === 0) return '(none)';
    switch (entityType) {
      case ReportEntityType.Match:
        return (
          MatchWarningFlagsEnumHelper.getMetadata(value)
            .map((m) => m.text)
            .join(', ') || String(value)
        );
      case ReportEntityType.Game:
        return (
          GameWarningFlagsEnumHelper.getMetadata(value)
            .map((m) => m.text)
            .join(', ') || String(value)
        );
      default:
        return String(value);
    }
  }

  if (key === 'ruleset' && typeof value === 'number') {
    return RulesetEnumHelper.getMetadata(value)?.text ?? String(value);
  }

  if (key === 'scoringType' && typeof value === 'number') {
    return ScoringTypeEnumHelper.getMetadata(value)?.text ?? String(value);
  }

  if (key === 'teamType' && typeof value === 'number') {
    return TeamTypeEnumHelper.getMetadata(value)?.text ?? String(value);
  }

  if (key === 'team' && typeof value === 'number') {
    return TeamEnumHelper.getMetadata(value)?.text ?? String(value);
  }

  if (key === 'grade' && typeof value === 'number') {
    return ScoreGradeEnumHelper.getMetadata(value)?.text ?? String(value);
  }

  if (key === 'mods' && typeof value === 'number') {
    if (value === 0) return 'None';
    const mods = ModsEnumHelper.getMetadata(value)
      .filter((m) => m.text)
      .map((m) => m.text);
    return mods.length > 0 ? mods.join(', ') : String(value);
  }

  if (
    (key === 'created' ||
      key === 'updated' ||
      key === 'startTime' ||
      key === 'endTime') &&
    typeof value === 'string'
  ) {
    try {
      return format(new Date(value), 'PPpp');
    } catch {
      return value;
    }
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (typeof value === 'number') {
    return value.toLocaleString();
  }

  if (typeof value === 'string') {
    if (value === '') return '(empty)';
    if (value.length > 100) {
      return `${value.slice(0, 100)}...`;
    }
    return value;
  }

  if (typeof value === 'object') {
    try {
      const str = JSON.stringify(value);
      if (str.length > 100) {
        return `${str.slice(0, 100)}...`;
      }
      return str;
    } catch {
      return '[object]';
    }
  }

  return String(value);
}

type AuditEntityState = {
  exists: boolean;
  data: unknown;
  entityType: ReportEntityType;
  entityDisplayName: string;
};

function getEntityLink(
  entityType: ReportEntityType,
  data: unknown
): string | null {
  if (!data || typeof data !== 'object') return null;

  const entity = data as Record<string, unknown>;

  switch (entityType) {
    case ReportEntityType.Tournament:
      return entity.id ? `/tournaments/${entity.id}` : null;
    case ReportEntityType.Match:
      return entity.id ? `/matches/${entity.id}` : null;
    case ReportEntityType.Game:
      return entity.matchId ? `/matches/${entity.matchId}` : null;
    case ReportEntityType.Score: {
      const gameData = entity.game as Record<string, unknown> | undefined;
      return gameData?.matchId ? `/matches/${gameData.matchId}` : null;
    }
    default:
      return null;
  }
}

const DEFAULT_VISIBLE_COUNT = 10;

export default function AuditEntityState({
  entityState,
}: {
  entityState: AuditEntityState;
}) {
  const [showAll, setShowAll] = useState(false);

  const entityTypeLabel = ReportEntityTypeEnumHelper.getMetadata(
    entityState.entityType
  ).text;

  if (!entityState.exists) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Entity Deleted</AlertTitle>
        <AlertDescription>
          This {entityTypeLabel.toLowerCase()} has been deleted and is no longer
          available in the system.
        </AlertDescription>
      </Alert>
    );
  }

  const entityLink = getEntityLink(entityState.entityType, entityState.data);

  const entityData = entityState.data as Record<string, unknown> | null;
  const allProperties = entityData
    ? Object.entries(entityData).filter(([key]) => !HIDDEN_PROPERTIES.has(key))
    : [];

  const hasMoreProperties = allProperties.length > DEFAULT_VISIBLE_COUNT;
  const displayedProperties = showAll
    ? allProperties
    : allProperties.slice(0, DEFAULT_VISIBLE_COUNT);
  const hiddenCount = allProperties.length - DEFAULT_VISIBLE_COUNT;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Current Entity State</CardTitle>
          {entityLink && (
            <Button variant="outline" size="sm" asChild>
              <Link href={entityLink}>
                View {entityTypeLabel}
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {displayedProperties.length > 0 ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/3">Property</TableHead>
                  <TableHead>Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedProperties.map(([key, value]) => (
                  <TableRow key={key}>
                    <TableCell className="text-muted-foreground font-medium">
                      {formatPropertyName(key)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatPropertyValue(key, value, entityState.entityType)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {hasMoreProperties && !showAll && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 w-full"
                onClick={() => setShowAll(true)}
              >
                Show All ({hiddenCount} more)
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            )}
          </>
        ) : (
          <p className="text-muted-foreground text-sm">No data available.</p>
        )}
      </CardContent>
    </Card>
  );
}
