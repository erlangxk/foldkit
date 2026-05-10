import { Option } from 'effect'
import { Scene, Ui } from 'foldkit'
import { describe, test } from 'vitest'

import { type Model, update, view } from './main'

const browseModel = (overrides: Partial<Model['route']> = {}): Model => ({
  route: {
    _tag: 'Browse',
    search: Option.none(),
    sorting: { _tag: 'Unsorted' },
    diet: Option.none(),
    period: Option.none(),
    ...overrides,
  } as Model['route'],
  dietListbox: Ui.Listbox.init({ id: 'diet-filter', selectedItem: '' }),
  periodListbox: Ui.Listbox.init({ id: 'period-filter', selectedItem: '' }),
})

describe('query-sync scene', () => {
  test('the Browse route renders the heading and search input', () => {
    Scene.scene(
      { update, view },
      Scene.with(browseModel()),
      Scene.expect(
        Scene.role('heading', { name: 'Dinosaur Explorer' }),
      ).toExist(),
      Scene.expect(Scene.placeholder('Search by name…')).toExist(),
    )
  })

  test('rendering shows the total dinosaur count', () => {
    Scene.scene(
      { update, view },
      Scene.with(browseModel()),
      Scene.expect(Scene.text('Showing', { exact: false })).toContainText(
        'dinosaurs',
      ),
    )
  })

  test('typing in the search input updates its rendered value', () => {
    Scene.scene(
      { update, view },
      Scene.with({
        ...browseModel(),
        route: {
          _tag: 'Browse',
          search: Option.some('Tyranno'),
          sorting: { _tag: 'Unsorted' },
          diet: Option.none(),
          period: Option.none(),
        },
      }),
      Scene.expect(Scene.placeholder('Search by name…')).toHaveValue('Tyranno'),
    )
  })

  test('a search with no matches shows the empty-state copy', () => {
    Scene.scene(
      { update, view },
      Scene.with({
        ...browseModel(),
        route: {
          _tag: 'Browse',
          search: Option.some('zzzNoMatch'),
          sorting: { _tag: 'Unsorted' },
          diet: Option.none(),
          period: Option.none(),
        },
      }),
      Scene.expect(Scene.text('No dinosaurs match your filters.')).toExist(),
    )
  })

  test('NotFound shows a friendly 404 and a back link', () => {
    Scene.scene(
      { update, view },
      Scene.with({
        ...browseModel(),
        route: { _tag: 'NotFound', path: '/oops' },
      }),
      Scene.expect(
        Scene.role('heading', { name: '404 — Page Not Found' }),
      ).toExist(),
      Scene.expect(Scene.text('The path "/oops" was not found.')).toExist(),
      Scene.expect(
        Scene.role('link', { name: '← Back to Dinosaur Explorer' }),
      ).toExist(),
    )
  })
})
