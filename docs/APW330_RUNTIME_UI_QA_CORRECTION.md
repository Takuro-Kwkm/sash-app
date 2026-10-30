# Runtime UI QA and canonical output metadata correction

The adopted source passed all103 native runtime parity cases. Its first Browser
scenario correctly displayed the checkbox group but failed an isVisible check
on the transparent native synchronization select. Playwright counts opacity0
as visible. Validate actual presentation, pointer behavior, accessibility and
tab order while retaining the separate visible-checkbox assertions.

Snapshot summaries retain a declared canonical semantic slot, allowing the
common estimate output to populate its window-type column when the authoring
field uses a different key. Legacy summaries keep their existing key lookup.
Product facts, master bytes, candidate data, flow order and styles are unchanged.
Original native failures and parity evidence remain preserved. New code uses a
new binding and a new fixed-payload Human Flow authorization; no old journal is edited.
