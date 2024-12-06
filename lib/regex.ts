/** Regex pattern for extracting osu! beatmap ids */
export const BeatmapLinkPattern = /https?:\/\/(?:osu|old)\.ppy\.sh\/(?:beatmapsets\/\d+(?:#osu\/|%23osu\/)|b\/|beatmaps\/|p\/beatmap\?b=)(\d+)/;

/** Regex pattern for extracting osu! multiplayer match ids */
export const MatchLinkPattern = /(https?:\/\/osu\.ppy\.sh\/community\/matches\/\d+|https?:\/\/osu\.ppy\.sh\/mp\/\d+)/;