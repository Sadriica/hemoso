import { strings } from '../strings'

// The screens of the app, in the order a person walks them. The label is what a
// person hears (the tab's accessible name); the section is the numbered label
// on screen (style guide 5, 7.2).
export const TABS = [
  { id: 'home', label: strings.tabs.home, section: strings.tabs.section.home },
  { id: 'entry', label: strings.tabs.entry, section: strings.tabs.section.entry },
  {
    id: 'history',
    label: strings.tabs.history,
    section: strings.tabs.section.history,
  },
] as const

export type TabId = (typeof TABS)[number]['id']
