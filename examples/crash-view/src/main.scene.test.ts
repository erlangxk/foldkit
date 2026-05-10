import { Scene } from 'foldkit'
import { describe, test } from 'vitest'

import { update, view } from './main'

describe('crash-view scene', () => {
  test('initial view shows the Crash button', () => {
    Scene.scene(
      { update, view },
      Scene.with(null),
      Scene.expect(Scene.role('button', { name: 'Crash' })).toExist(),
    )
  })
})
