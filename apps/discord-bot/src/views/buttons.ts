import {
  ButtonStyle,
  ComponentType,
  type APIActionRowComponent,
  type APIButtonComponent,
  type APIComponentInMessageActionRow,
} from 'discord.js';

import { encodeCustomId, type CustomId } from '../custom-id';

export const button = (
  label: string,
  id: CustomId,
  active = false
): APIButtonComponent => ({
  type: ComponentType.Button,
  style: active ? ButtonStyle.Primary : ButtonStyle.Secondary,
  label,
  custom_id: encodeCustomId(id),
});

export const linkButton = (label: string, url: string): APIButtonComponent => ({
  type: ComponentType.Button,
  style: ButtonStyle.Link,
  label,
  url,
});

export const row = (
  ...components: APIComponentInMessageActionRow[]
): APIActionRowComponent<APIComponentInMessageActionRow> => ({
  type: ComponentType.ActionRow,
  components,
});

/** The previous and next buttons of a paged view. */
export const pageButtons = (
  id: CustomId,
  pages: number
): APIButtonComponent[] => [
  {
    ...button('◀', { ...id, page: Math.max(1, id.page - 1) }),
    disabled: id.page <= 1,
  },
  {
    ...button('▶', { ...id, page: Math.min(pages, id.page + 1) }),
    disabled: id.page >= pages,
  },
];

/** A pager row; empty when the list fits on one page. */
export const pager = (id: CustomId, pages: number) =>
  pages > 1 ? [row(...pageButtons(id, pages))] : [];

/** One row of view tabs and a trailing link; the active tab is primary. */
export const tabs = (
  key: string,
  ruleset: number | null,
  active: string,
  views: [label: string, view: string][],
  link: APIButtonComponent
) =>
  row(
    ...views.map(([label, view]) =>
      button(label, { view, key, ruleset, page: 1 }, view === active)
    ),
    link
  );
