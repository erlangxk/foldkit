---
'foldkit': minor
---

Add `Dom.scrollToAnchor` for jumping to a URL hash anchor.

```ts
const ScrollToAnchor = Command.define(
  'ScrollToAnchor',
  { hash: S.String },
  CompletedScrollToAnchor,
)(({ hash }) =>
  Dom.scrollToAnchor(hash).pipe(
    Effect.ignore,
    Effect.as(CompletedScrollToAnchor()),
  ),
)
```

Pass the id without a leading `#`, matching the shape of `Url.hash` (which strips the separator during parsing). The helper waits for `Render.afterPaint` so the target element is in the DOM and laid out before the scroll fires. Use this when a Message has just routed to a new page whose anchor target does not yet exist; for a static page where the element is already present, `Dom.scrollIntoView` is the lighter choice.

By default, the target is also made keyboard-focusable (adding `tabindex="-1"` if missing) and focused with `preventScroll: true`. This is the accessibility-correct behavior for in-page navigation: keyboard users continue tabbing from the section they landed in, and screen readers announce the new location. Pass `{ moveFocus: false }` for a pure scroll.

Fails with `ElementNotFound` if no element with the given id exists; pipe through `Effect.ignore` to no-op on stale or broken anchors.
