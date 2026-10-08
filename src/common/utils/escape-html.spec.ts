import { escapeHtml } from './escape-html';

describe('escapeHtml', () => {
  it('should escape HTML special characters', () => {
    expect(escapeHtml(`<a href="x" onclick='y'>&</a>`)).toBe(
      '&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;',
    );
  });

  it('should leave plain text untouched', () => {
    expect(escapeHtml('Juan Pérez, 2 cajas')).toBe('Juan Pérez, 2 cajas');
  });
});
