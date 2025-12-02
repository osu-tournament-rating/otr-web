import { ORPCError } from '@orpc/server';
import {
  SQL,
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  lte,
  or,
  sql,
} from 'drizzle-orm';
import * as schema from '@otr/core/db/schema';
import { Ruleset } from '@otr/core/osu';
import { DataFetchStatus } from '@otr/core/db/data-fetch-status';

import {
  BeatmapListRequestSchema,
  BeatmapListResponseSchema,
  BeatmapListItemSchema,
} from '@/lib/orpc/schema/beatmapList';
import { publicProcedure } from './base';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
const DEFAULT_MAX_SR = 200;
const LIKE_ESCAPE_PATTERN = /[%_\\]/g;

const escapeLikePattern = (value: string) =>
  value.replace(LIKE_ESCAPE_PATTERN, (match) => `\\${match}`);

export const listBeatmaps = publicProcedure
  .input(BeatmapListRequestSchema)
  .output(BeatmapListResponseSchema)
  .route({
    summary: 'List beatmaps with filtering and pagination',
    tags: ['public'],
    method: 'GET',
    path: '/beatmaps',
  })
  .handler(async ({ input, context }) => {
    try {
      const page = Math.max(input.page ?? 1, 1);
      const pageSize = Math.max(
        1,
        Math.min(input.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
      );
      const offset = (page - 1) * pageSize;

      const filters: SQL<unknown>[] = [];

      if (input.searchQuery) {
        const searchTerm = input.searchQuery.trim();
        if (searchTerm.length > 0) {
          const searchPattern = `%${escapeLikePattern(searchTerm)}%`;
          const searchCondition = or(
            ilike(schema.beatmaps.diffName, searchPattern),
            ilike(schema.beatmapsets.artist, searchPattern),
            ilike(schema.beatmapsets.title, searchPattern),
            ilike(schema.players.username, searchPattern)
          );
          if (searchCondition) {
            filters.push(searchCondition);
          }
        }
      }

      if (input.minSr !== undefined)
        filters.push(gte(schema.beatmaps.sr, input.minSr));
      const effectiveMaxSr = input.maxSr ?? DEFAULT_MAX_SR;
      filters.push(lte(schema.beatmaps.sr, effectiveMaxSr));
      if (input.minBpm !== undefined)
        filters.push(gte(schema.beatmaps.bpm, input.minBpm));
      if (input.maxBpm !== undefined)
        filters.push(lte(schema.beatmaps.bpm, input.maxBpm));
      if (input.minCs !== undefined)
        filters.push(gte(schema.beatmaps.cs, input.minCs));
      if (input.maxCs !== undefined)
        filters.push(lte(schema.beatmaps.cs, input.maxCs));
      if (input.minAr !== undefined)
        filters.push(gte(schema.beatmaps.ar, input.minAr));
      if (input.maxAr !== undefined)
        filters.push(lte(schema.beatmaps.ar, input.maxAr));
      if (input.minOd !== undefined)
        filters.push(gte(schema.beatmaps.od, input.minOd));
      if (input.maxOd !== undefined)
        filters.push(lte(schema.beatmaps.od, input.maxOd));
      if (input.minHp !== undefined)
        filters.push(gte(schema.beatmaps.hp, input.minHp));
      if (input.maxHp !== undefined)
        filters.push(lte(schema.beatmaps.hp, input.maxHp));
      if (input.minLength !== undefined)
        filters.push(gte(schema.beatmaps.totalLength, input.minLength));
      if (input.maxLength !== undefined)
        filters.push(lte(schema.beatmaps.totalLength, input.maxLength));
      if (input.ruleset === Ruleset.Mania4k) {
        filters.push(ilike(schema.beatmaps.diffName, '%[4K]%'));
      } else if (input.ruleset === Ruleset.Mania7k) {
        filters.push(ilike(schema.beatmaps.diffName, '%[7K]%'));
      } else if (input.ruleset !== undefined) {
        filters.push(eq(schema.beatmaps.ruleset, input.ruleset));
      }

      if (input.minGameCount !== undefined) {
        filters.push(
          gte(
            sql`COALESCE(${schema.beatmapStats.verifiedGameCount}, 0)`,
            input.minGameCount
          )
        );
      }
      if (input.maxGameCount !== undefined) {
        filters.push(
          lte(
            sql`COALESCE(${schema.beatmapStats.verifiedGameCount}, 0)`,
            input.maxGameCount
          )
        );
      }
      if (input.minTournamentCount !== undefined) {
        filters.push(
          gte(
            sql`COALESCE(${schema.beatmapStats.verifiedTournamentCount}, 0)`,
            input.minTournamentCount
          )
        );
      }
      if (input.maxTournamentCount !== undefined) {
        filters.push(
          lte(
            sql`COALESCE(${schema.beatmapStats.verifiedTournamentCount}, 0)`,
            input.maxTournamentCount
          )
        );
      }

      filters.push(
        sql`${schema.beatmaps.dataFetchStatus} != ${DataFetchStatus.NotFound}`
      );

      filters.push(eq(schema.beatmapStats.hasVerifiedAppearance, true));

      const whereClause = filters.length > 0 ? and(...filters) : undefined;

      const sortValue = input.sort ?? 'sr';
      const isDescending = input.descending ?? true;
      const direction = isDescending ? desc : asc;

      const getSortColumn = () => {
        switch (sortValue) {
          case 'sr':
            return schema.beatmaps.sr;
          case 'bpm':
            return schema.beatmaps.bpm;
          case 'cs':
            return schema.beatmaps.cs;
          case 'ar':
            return schema.beatmaps.ar;
          case 'od':
            return schema.beatmaps.od;
          case 'hp':
            return schema.beatmaps.hp;
          case 'length':
            return schema.beatmaps.totalLength;
          case 'tournamentCount':
            return schema.beatmapStats.verifiedTournamentCount;
          case 'gameCount':
            return schema.beatmapStats.verifiedGameCount;
          case 'creator':
            return schema.players.username;
          default:
            return schema.beatmaps.sr;
        }
      };

      const creatorSubquery = context.db
        .select({
          beatmapId: schema.joinBeatmapCreators.createdBeatmapsId,
          creatorId:
            sql<number>`MIN(${schema.joinBeatmapCreators.creatorsId})`.as(
              'creator_id'
            ),
        })
        .from(schema.joinBeatmapCreators)
        .groupBy(schema.joinBeatmapCreators.createdBeatmapsId)
        .as('beatmap_creator');

      const baseQuery = context.db
        .select({
          id: schema.beatmaps.id,
          osuId: schema.beatmaps.osuId,
          diffName: schema.beatmaps.diffName,
          ruleset: schema.beatmaps.ruleset,
          sr: schema.beatmaps.sr,
          bpm: schema.beatmaps.bpm,
          cs: schema.beatmaps.cs,
          ar: schema.beatmaps.ar,
          od: schema.beatmaps.od,
          hp: schema.beatmaps.hp,
          totalLength: schema.beatmaps.totalLength,
          artist: schema.beatmapsets.artist,
          title: schema.beatmapsets.title,
          beatmapsetOsuId: schema.beatmapsets.osuId,
          creator: schema.players.username,
          verifiedTournamentCount:
            sql<number>`COALESCE(${schema.beatmapStats.verifiedTournamentCount}, 0)`.as(
              'verified_tournament_count'
            ),
          verifiedGameCount:
            sql<number>`COALESCE(${schema.beatmapStats.verifiedGameCount}, 0)`.as(
              'verified_game_count'
            ),
        })
        .from(schema.beatmaps)
        .innerJoin(
          schema.beatmapStats,
          eq(schema.beatmaps.id, schema.beatmapStats.beatmapId)
        )
        .leftJoin(
          schema.beatmapsets,
          eq(schema.beatmaps.beatmapsetId, schema.beatmapsets.id)
        )
        .leftJoin(
          creatorSubquery,
          eq(schema.beatmaps.id, creatorSubquery.beatmapId)
        )
        .leftJoin(
          schema.players,
          sql`"beatmap_creator"."creator_id" = ${schema.players.id}`
        );

      const conditionedQuery = whereClause
        ? baseQuery.where(whereClause)
        : baseQuery;

      const rows = await conditionedQuery
        .orderBy(direction(getSortColumn()), direction(schema.beatmaps.id))
        .limit(pageSize)
        .offset(offset);

      const countQuery = context.db
        .select({ count: count() })
        .from(schema.beatmaps)
        .innerJoin(
          schema.beatmapStats,
          eq(schema.beatmaps.id, schema.beatmapStats.beatmapId)
        )
        .leftJoin(
          schema.beatmapsets,
          eq(schema.beatmaps.beatmapsetId, schema.beatmapsets.id)
        )
        .leftJoin(
          creatorSubquery,
          eq(schema.beatmaps.id, creatorSubquery.beatmapId)
        )
        .leftJoin(
          schema.players,
          sql`"beatmap_creator"."creator_id" = ${schema.players.id}`
        );

      const countResult = whereClause
        ? await countQuery.where(whereClause)
        : await countQuery;

      const totalCount = countResult[0]?.count ?? 0;
      const totalPages = Math.ceil(totalCount / pageSize);

      const items = rows.map((row) =>
        BeatmapListItemSchema.parse({
          id: row.id,
          osuId: row.osuId,
          artist: row.artist ?? 'Unknown Artist',
          title: row.title ?? 'Unknown Title',
          diffName: row.diffName,
          ruleset: row.ruleset,
          sr: row.sr,
          bpm: row.bpm,
          cs: row.cs,
          ar: row.ar,
          od: row.od,
          hp: row.hp,
          totalLength: row.totalLength,
          beatmapsetOsuId: row.beatmapsetOsuId ?? null,
          creator: row.creator ?? null,
          verifiedTournamentCount: Number(row.verifiedTournamentCount) || 0,
          verifiedGameCount: Number(row.verifiedGameCount) || 0,
        })
      );

      return {
        items,
        totalCount,
        page,
        pageSize,
        totalPages,
      };
    } catch (error) {
      console.error('[orpc] beatmaps.list failed', error);

      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message:
          error instanceof Error ? error.message : 'Failed to load beatmaps',
      });
    }
  });
