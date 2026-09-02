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

/** A previous and next row; empty when the list fits on one page. */
export const pager = (id: CustomId, pages: number) =>
  pages > 1
    ? [
        row(
          {
            ...button('◀', { ...id, page: Math.max(1, id.page - 1) }),
            disabled: id.page <= 1,
          },
          {
            ...button('▶', { ...id, page: Math.min(pages, id.page + 1) }),
            disabled: id.page >= pages,
          }
        ),
      ]
    : [];
