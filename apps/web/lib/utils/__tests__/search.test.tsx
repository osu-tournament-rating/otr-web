import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { highlightMatch } from '../search';

const render = (text: string, match: string) =>
  renderToStaticMarkup(<>{highlightMatch(text, match)}</>);

const HIGHLIGHT = '<span class="font-semibold text-primary">';

describe('highlightMatch', () => {
  it('returns the text untouched without a usable query', () => {
    expect(render('w/WWW', '')).toBe('w/WWW');
    expect(render('w/WWW', '///')).toBe('w/WWW');
  });

  it('highlights a single token case-insensitively', () => {
    expect(render('w/WWW feat. Toto', 'www')).toBe(
      `w/${HIGHLIGHT}WWW</span> feat. Toto`
    );
  });

  it('highlights the punctuation between adjacent tokens', () => {
    expect(render('w/WWW feat. Toto', 'w/www')).toBe(
      `${HIGHLIGHT}w/WWW</span> feat. Toto`
    );
  });

  it('falls back to individual tokens when they are not adjacent', () => {
    expect(render('WWW and w', 'w/www')).toBe(
      `${HIGHLIGHT}WWW</span> and ${HIGHLIGHT}w</span>`
    );
  });

  it('highlights the longest adjacent run first', () => {
    expect(render('a-b c', 'a b c')).toBe(`${HIGHLIGHT}a-b c</span>`);
  });
});
