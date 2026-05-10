import { Calendar, Scene } from 'foldkit'
import { describe, test } from 'vitest'

import { uiInit } from './init'
import { type Model, update, view } from './main'

const today = Calendar.make(2026, 4, 16)
const [initialUiModel] = uiInit(today)

const modelForRoute = (route: Model['route']): Model => ({
  route,
  uiModel: initialUiModel,
})

const homeModel = modelForRoute({ _tag: 'Home' })

describe('ui-showcase scene', () => {
  test('the sidebar nav lists a sample of every component link', () => {
    Scene.scene(
      { update, view },
      Scene.with(homeModel),
      Scene.expect(Scene.role('link', { name: 'Button' })).toExist(),
      Scene.expect(Scene.role('link', { name: 'Calendar' })).toExist(),
      Scene.expect(Scene.role('link', { name: 'Dialog' })).toExist(),
      Scene.expect(Scene.role('link', { name: 'Toast' })).toExist(),
      Scene.expect(Scene.role('link', { name: 'Virtual List' })).toExist(),
    )
  })

  test('the Home route shows the showcase heading and description', () => {
    Scene.scene(
      { update, view },
      Scene.with(homeModel),
      Scene.expect(
        Scene.role('heading', { name: 'Foldkit UI Showcase' }),
      ).toExist(),
      Scene.expect(
        Scene.text('This is a showcase of every Foldkit UI component.', {
          exact: false,
        }),
      ).toExist(),
    )
  })

  test('simple component routes render the sidebar nav', () => {
    const routes: ReadonlyArray<Model['route']> = [
      { _tag: 'Button' },
      { _tag: 'Checkbox' },
      { _tag: 'Disclosure' },
      { _tag: 'Fieldset' },
      { _tag: 'Input' },
      { _tag: 'RadioGroup' },
      { _tag: 'Select' },
      { _tag: 'Switch' },
      { _tag: 'Textarea' },
      { _tag: 'Animation' },
    ]

    routes.forEach(route => {
      Scene.scene(
        { update, view },
        Scene.with(modelForRoute(route)),
        Scene.expect(Scene.role('link', { name: 'Button' })).toExist(),
      )
    })
  })

  test('the NotFound route renders the 404 panel and a Go Home link', () => {
    Scene.scene(
      { update, view },
      Scene.with(modelForRoute({ _tag: 'NotFound', path: '/oops' })),
      Scene.expect(
        Scene.role('heading', { name: '404 — Page Not Found' }),
      ).toExist(),
      Scene.expect(Scene.text('The path "/oops" was not found.')).toExist(),
      Scene.expect(Scene.role('link', { name: 'Go Home' })).toExist(),
    )
  })
})
