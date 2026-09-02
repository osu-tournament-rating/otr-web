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

// Discord rejects two equal custom ids in one message; parseCustomId rejects the off: ids.
const pageButton = (
  label: string,
  id: CustomId,
  target: number,
  pages: number,
  placeholder: string
): APIButtonComponent =>
  target >= 1 && target <= pages
    ? { ...button(label, { ...id, page: target }), disabled: false }
    : {
        type: ComponentType.Button,
        style: ButtonStyle.Secondary,
        label,
        custom_id: placeholder,
        disabled: true,
      };

/** The previous and next buttons of a paged view. */
export const pageButtons = (
  id: CustomId,
  pages: number
): APIButtonComponent[] => [
  pageButton('◀', id, id.page - 1, pages, 'off:prev'),
  pageButton('▶', id, id.page + 1, pages, 'off:next'),
];

/** A pager row; empty when the list fits on one page. */
export const pager = (id: CustomId, pages: number) =>
  pages > 1 ? [row(...pageButtons(id, pages))] : [];

/** One row of view tabs and a trailing link; the active tab is primary. */
export const tabs = (
  key: string,
  ruleset: number | null,
  active: string,
  page: number,
  views: [label: string, view: string][],
  link: APIButtonComponent
) =>
  row(
    ...views.map(([label, view]) =>
      button(
        label,
        { view, key, ruleset, page: view === active ? page : 1 },
        view === active
      )
    ),
    link
  );
