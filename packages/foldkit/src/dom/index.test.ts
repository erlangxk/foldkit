import { describe, it } from '@effect/vitest'
import { Effect } from 'effect'
import { expect } from 'vitest'

import {
  ElementNotFound,
  focus,
  inertOthers,
  lockScroll,
  restoreInert,
  scrollToAnchor,
  unlockScroll,
} from './index.js'

describe('focus', () => {
  it.effect('fails with ElementNotFound when element is not found', () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(focus('#nonexistent'))
      expect(error).toBeInstanceOf(ElementNotFound)
      expect(error.selector).toBe('#nonexistent')
    }),
  )
})

describe('scrollToAnchor', () => {
  const buildAnchor = (id: string): HTMLElement => {
    const section = document.createElement('section')
    section.id = id
    document.body.appendChild(section)
    return section
  }

  const cleanupDom = () => {
    document.body.innerHTML = ''
  }

  it.effect('fails with ElementNotFound when no element matches the id', () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(scrollToAnchor('missing-section'))
      expect(error).toBeInstanceOf(ElementNotFound)
      expect(error.selector).toBe('#missing-section')
    }),
  )

  it.effect('adds tabindex="-1" and focuses the target by default', () =>
    Effect.gen(function* () {
      const section = buildAnchor('overview')

      yield* scrollToAnchor('overview')

      expect(section.getAttribute('tabindex')).toBe('-1')
      expect(document.activeElement).toBe(section)

      cleanupDom()
    }),
  )

  it.effect('preserves an existing tabindex when moving focus', () =>
    Effect.gen(function* () {
      const section = buildAnchor('overview')
      section.setAttribute('tabindex', '0')

      yield* scrollToAnchor('overview')

      expect(section.getAttribute('tabindex')).toBe('0')
      expect(document.activeElement).toBe(section)

      cleanupDom()
    }),
  )

  it.effect('skips focus management when moveFocus is false', () =>
    Effect.gen(function* () {
      const section = buildAnchor('overview')
      const sentinel = document.createElement('button')
      document.body.appendChild(sentinel)
      sentinel.focus()

      yield* scrollToAnchor('overview', { moveFocus: false })

      expect(section.hasAttribute('tabindex')).toBe(false)
      expect(document.activeElement).toBe(sentinel)

      cleanupDom()
    }),
  )
})

describe('lockScroll', () => {
  it.effect('sets overflow hidden on document element', () =>
    Effect.gen(function* () {
      yield* lockScroll
      expect(document.documentElement.style.overflow).toBe('hidden')

      yield* unlockScroll
    }),
  )

  it.effect('restores original overflow on unlock', () =>
    Effect.gen(function* () {
      document.documentElement.style.overflow = 'auto'

      yield* lockScroll
      expect(document.documentElement.style.overflow).toBe('hidden')

      yield* unlockScroll
      expect(document.documentElement.style.overflow).toBe('auto')

      document.documentElement.style.overflow = ''
    }),
  )

  it.effect('supports nested locks via reference counting', () =>
    Effect.gen(function* () {
      yield* lockScroll
      yield* lockScroll
      expect(document.documentElement.style.overflow).toBe('hidden')

      yield* unlockScroll
      expect(document.documentElement.style.overflow).toBe('hidden')

      yield* unlockScroll
      expect(document.documentElement.style.overflow).toBe('')
    }),
  )
})

describe('unlockScroll', () => {
  it.effect('is safe to call without a preceding lock', () =>
    Effect.gen(function* () {
      yield* unlockScroll
    }),
  )
})

describe('inertOthers', () => {
  const buildDom = () => {
    const header = document.createElement('header')
    const main = document.createElement('main')
    const sidebar = document.createElement('div')
    sidebar.id = 'sidebar'
    const content = document.createElement('div')
    content.id = 'content'
    const button = document.createElement('button')
    button.id = 'menu-button'
    const items = document.createElement('div')
    items.id = 'menu-items'
    const footer = document.createElement('footer')

    content.appendChild(button)
    content.appendChild(items)
    main.appendChild(sidebar)
    main.appendChild(content)
    document.body.appendChild(header)
    document.body.appendChild(main)
    document.body.appendChild(footer)

    return { header, main, sidebar, content, button, items, footer }
  }

  const cleanupDom = () => {
    document.body.innerHTML = ''
  }

  it.effect('marks siblings of allowed elements as inert', () =>
    Effect.gen(function* () {
      const { header, main, sidebar, content, button, items, footer } =
        buildDom()

      yield* inertOthers('test', ['#menu-button', '#menu-items'])

      expect(header.inert).toBe(true)
      expect(header.getAttribute('aria-hidden')).toBe('true')
      expect(footer.inert).toBe(true)
      expect(footer.getAttribute('aria-hidden')).toBe('true')
      expect(sidebar.inert).toBe(true)
      expect(sidebar.getAttribute('aria-hidden')).toBe('true')

      expect(main.inert).toBeFalsy()
      expect(content.inert).toBeFalsy()
      expect(button.inert).toBeFalsy()
      expect(items.inert).toBeFalsy()

      yield* restoreInert('test')
      cleanupDom()
    }),
  )

  it.effect('restores original values', () =>
    Effect.gen(function* () {
      const { header, footer } = buildDom()
      header.setAttribute('aria-hidden', 'false')

      yield* inertOthers('test', ['#menu-button', '#menu-items'])

      expect(header.getAttribute('aria-hidden')).toBe('true')

      yield* restoreInert('test')

      expect(header.getAttribute('aria-hidden')).toBe('false')
      expect(footer.getAttribute('aria-hidden')).toBeNull()

      cleanupDom()
    }),
  )

  it.effect('removes aria-hidden when original was null', () =>
    Effect.gen(function* () {
      const { header } = buildDom()
      expect(header.getAttribute('aria-hidden')).toBeNull()

      yield* inertOthers('test', ['#menu-button', '#menu-items'])

      expect(header.getAttribute('aria-hidden')).toBe('true')

      yield* restoreInert('test')

      expect(header.getAttribute('aria-hidden')).toBeNull()

      cleanupDom()
    }),
  )

  it.effect('supports nested locks via reference counting', () =>
    Effect.gen(function* () {
      const { header } = buildDom()

      yield* inertOthers('first', ['#menu-button', '#menu-items'])
      yield* inertOthers('second', ['#menu-button', '#menu-items'])

      expect(header.inert).toBe(true)

      yield* restoreInert('first')
      expect(header.inert).toBe(true)

      yield* restoreInert('second')
      expect(header.inert).toBeFalsy()

      cleanupDom()
    }),
  )

  it.effect('handles missing selectors gracefully', () =>
    Effect.gen(function* () {
      buildDom()

      yield* inertOthers('test', ['#nonexistent', '#also-missing'])

      yield* restoreInert('test')
      cleanupDom()
    }),
  )
})

describe('restoreInert', () => {
  it.effect('is safe to call without a preceding inertOthers', () =>
    Effect.gen(function* () {
      yield* restoreInert('nonexistent')
    }),
  )
})
