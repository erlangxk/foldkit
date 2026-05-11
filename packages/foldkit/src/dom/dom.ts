import {
  Array,
  Effect,
  Equal,
  Function,
  Match as M,
  Number,
  Option,
} from 'effect'

import { afterCommit, afterPaint } from '../render/render.js'
import { ElementNotFound } from './error.js'

const BASE_DIALOG_Z_INDEX = 2147483600
let openDialogCount = 0

const dialogCleanups = new WeakMap<HTMLDialogElement, () => void>()

const FOCUSABLE_SELECTOR = Array.join(
  [
    'a[href]:not([tabindex="-1"])',
    'button:not([disabled]):not([tabindex="-1"])',
    'input:not([disabled]):not([tabindex="-1"])',
    'select:not([disabled]):not([tabindex="-1"])',
    'textarea:not([disabled]):not([tabindex="-1"])',
    '[tabindex]:not([tabindex="-1"])',
  ],
  ', ',
)

const queryHTMLElement = (
  selector: string,
): Effect.Effect<HTMLElement, ElementNotFound> =>
  Effect.suspend(() => {
    const element = document.querySelector(selector)
    return element instanceof HTMLElement
      ? Effect.succeed(element)
      : Effect.fail(new ElementNotFound({ selector }))
  })

/**
 * Focuses an element matching the given selector after the next render has
 * committed.
 *
 * Use `Dom.focus` inside a Command for focus that's caused by a Message
 * dispatching: a dialog opening, an input becoming the active step in a
 * form, returning focus to a trigger button after a popover closes,
 * keyboard navigation across a stable layout. The Command fires from
 * `update`'s return; the focus runs after the next render commits, so the
 * element is in place by the time `.focus()` runs.
 *
 * Do not use `OnMount` for focus. The cause of focus-on-open is the
 * Message, not the element appearing. Mount is for per-instance lifecycle
 * effects bound to a VNode existing where the live element handle is
 * needed (positioning, portaling, observer attachment, library setup).
 *
 * Fails with `ElementNotFound` if the selector does not match an `HTMLElement`.
 *
 * @example
 * ```typescript
 * Dom.focus('#email-input').pipe(Effect.ignore, Effect.as(CompletedFocusInput()))
 * ```
 */
export const focus = (selector: string): Effect.Effect<void, ElementNotFound> =>
  Effect.gen(function* () {
    yield* afterCommit
    const element = yield* queryHTMLElement(selector)
    element.focus()
  })

/**
 * Opens a dialog element using `show()` with high z-index, focus trapping,
 * and Escape key handling. Uses `show()` instead of `showModal()` so that
 * DevTools (and any other high-z-index overlay) remains interactive. The
 * Dialog component provides its own backdrop, scroll locking, and transitions.
 * Fails with `ElementNotFound` if the selector does not match an `HTMLDialogElement`.
 *
 * Pass `focusSelector` to focus an element inside the dialog when it opens.
 *
 * @example
 * ```typescript
 * Dom.showModal('#my-dialog').pipe(Effect.ignore, Effect.as(CompletedShowDialog()))
 * Dom.showModal('#my-dialog', { focusSelector: '#search-input' }).pipe(Effect.ignore, Effect.as(CompletedShowDialog()))
 * ```
 */
export const showModal = (
  selector: string,
  options?: Readonly<{ focusSelector?: string }>,
): Effect.Effect<void, ElementNotFound> =>
  Effect.gen(function* () {
    yield* afterCommit

    const element = document.querySelector(selector)

    if (!(element instanceof HTMLDialogElement)) {
      return yield* Effect.fail(new ElementNotFound({ selector }))
    }

    element.style.position = 'fixed'
    element.style.inset = '0'
    openDialogCount++
    element.style.zIndex = String(BASE_DIALOG_Z_INDEX + openDialogCount)
    element.show()

    const handleKeydown = (event: KeyboardEvent): void => {
      if (!element.open) {
        return
      }

      M.value(event.key).pipe(
        M.when('Escape', () => {
          if (event.defaultPrevented) {
            return
          }

          event.preventDefault()
          element.dispatchEvent(new Event('cancel', { cancelable: true }))
        }),
        M.when('Tab', () => {
          trapFocusWithinDialog(event, element)
        }),
        M.orElse(Function.constVoid),
      )
    }

    document.addEventListener('keydown', handleKeydown)
    dialogCleanups.set(element, () =>
      document.removeEventListener('keydown', handleKeydown),
    )

    if (options?.focusSelector) {
      const focusTarget = element.querySelector(options.focusSelector)
      if (focusTarget instanceof HTMLElement) {
        focusTarget.focus()
      }
    }
  })

const trapFocusWithinDialog = (
  event: KeyboardEvent,
  dialog: HTMLDialogElement,
): void => {
  const focusable = Array.fromIterable(
    dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  )
  if (Array.isReadonlyArrayNonEmpty(focusable)) {
    const first = Array.headNonEmpty(focusable)
    const last = Array.lastNonEmpty(focusable)

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }
}

/**
 * Closes a dialog element using `.close()`.
 * Cleans up the keyboard handlers installed by `showModal`.
 * Fails with `ElementNotFound` if the selector does not match an `HTMLDialogElement`.
 *
 * @example
 * ```typescript
 * Dom.closeModal('#my-dialog').pipe(Effect.ignore, Effect.as(CompletedCloseDialog()))
 * ```
 */
export const closeModal = (
  selector: string,
): Effect.Effect<void, ElementNotFound> =>
  Effect.suspend(() => {
    const element = document.querySelector(selector)
    if (element instanceof HTMLDialogElement) {
      element.close()
      openDialogCount = Math.max(0, openDialogCount - 1)
      const cleanup = dialogCleanups.get(element)
      if (cleanup) {
        cleanup()
        dialogCleanups.delete(element)
      }
      return Effect.void
    }
    return Effect.fail(new ElementNotFound({ selector }))
  })

/**
 * Programmatically clicks an element matching the given selector.
 * Fails with `ElementNotFound` if the selector does not match an `HTMLElement`.
 *
 * @example
 * ```typescript
 * Dom.clickElement('#menu-item-2').pipe(Effect.ignore, Effect.as(CompletedClickItem()))
 * ```
 */
export const clickElement = (
  selector: string,
): Effect.Effect<void, ElementNotFound> =>
  Effect.gen(function* () {
    yield* afterCommit
    const element = yield* queryHTMLElement(selector)
    element.click()
  })

/**
 * Scrolls an element into view by selector using `{ block: 'nearest' }`.
 * Fails with `ElementNotFound` if the selector does not match an `HTMLElement`.
 *
 * @example
 * ```typescript
 * Dom.scrollIntoView('#active-item').pipe(Effect.ignore, Effect.as(CompletedScrollIntoView()))
 * ```
 */
export const scrollIntoView = (
  selector: string,
): Effect.Effect<void, ElementNotFound> =>
  Effect.gen(function* () {
    yield* afterCommit
    const element = yield* queryHTMLElement(selector)
    element.scrollIntoView({ block: 'nearest' })
  })

/**
 * Scrolls to the element with the given id after the next paint, optionally
 * moving keyboard focus to it.
 *
 * Use after a Message that changes which content is in the DOM, such as
 * routing to a new page with a URL hash. The two-frame wait gives the
 * runtime time to commit the new Model and the browser time to lay it out,
 * so the target element exists and its position is settled before the
 * scroll fires.
 *
 * Pass the id without a leading `#` (matching `Url.hash`, which strips the
 * separator during parsing). To scroll to an arbitrary element by CSS
 * selector, use `scrollIntoView`.
 *
 * When `moveFocus` is `true` (the default), the target is also made
 * keyboard-focusable by adding `tabindex="-1"` if missing, then focused
 * with `preventScroll: true`. This is the accessibility-correct behavior
 * for in-page navigation: keyboard users continue tabbing from the section
 * they landed in, and screen readers announce the new location. Pass
 * `moveFocus: false` for a pure scroll.
 *
 * Fails with `ElementNotFound` if no element with the given id exists.
 *
 * @example
 * ```typescript
 * Dom.scrollToAnchor('animation-frames').pipe(Effect.ignore, Effect.as(CompletedScrollToAnchor()))
 * Dom.scrollToAnchor('animation-frames', { moveFocus: false }).pipe(Effect.ignore, Effect.as(CompletedScrollToAnchor()))
 * ```
 */
export const scrollToAnchor = (
  hash: string,
  options?: Readonly<{ moveFocus?: boolean }>,
): Effect.Effect<void, ElementNotFound> =>
  Effect.gen(function* () {
    yield* afterPaint
    const element = document.getElementById(hash)
    if (element === null) {
      return yield* Effect.fail(new ElementNotFound({ selector: `#${hash}` }))
    }
    element.scrollIntoView({ behavior: 'instant' })
    const moveFocus = options?.moveFocus ?? true
    if (moveFocus) {
      if (!element.hasAttribute('tabindex')) {
        element.setAttribute('tabindex', '-1')
      }
      element.focus({ preventScroll: true })
    }
  })

/** Direction for focus advancement: forward or backward in tab order. */
export type FocusDirection = 'Next' | 'Previous'

/**
 * Focuses the next or previous focusable element in the document relative to the element matching the given selector.
 * Fails with `ElementNotFound` if the selector does not match an `HTMLElement`.
 *
 * @example
 * ```typescript
 * Dom.advanceFocus('#menu-button', 'Next').pipe(Effect.ignore, Effect.as(CompletedAdvanceFocus()))
 * ```
 */
export const advanceFocus = (
  selector: string,
  direction: FocusDirection,
): Effect.Effect<void, ElementNotFound> =>
  Effect.gen(function* () {
    yield* afterCommit

    const reference = yield* queryHTMLElement(selector)

    const focusableElements = Array.fromIterable(
      document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    )

    const referenceElementIndex = Array.findFirstIndex(
      focusableElements,
      Equal.equals(reference),
    )

    if (Option.isNone(referenceElementIndex)) {
      return yield* Effect.fail(new ElementNotFound({ selector }))
    }

    const offsetReferenceElementIndex = M.value(direction).pipe(
      M.when('Next', () => Number.increment),
      M.when('Previous', () => Number.decrement),
      M.exhaustive,
    )(referenceElementIndex.value)

    const nextElement = Array.get(
      focusableElements,
      offsetReferenceElementIndex,
    )

    if (Option.isSome(nextElement)) {
      nextElement.value.focus()
    }
  })
