import { describe, expect, test } from 'vitest'

import { ClickedCrash, update } from './main'

describe('crash-view update', () => {
  test('handling any Message throws to trigger the crash view', () => {
    expect(() => update(null, ClickedCrash())).toThrow(
      'This is a simulated crash!',
    )
  })
})
