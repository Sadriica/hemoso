import { Box, Tab, Tabs } from '@mui/material'
import { strings } from '../strings'
import { TABS, type TabId } from './tabs'

// The tab bar (7.2) on MUI Tabs, which follows the WAI-ARIA tabs pattern
// itself: one tab stop, arrow keys between the tabs, Home and End at the ends.
// Selection follows the focus, so the screen and the focus never disagree.
//
// The visible label is the numbered section label of the style guide. The name
// a person hears starts with the plain screen name and then repeats that label
// (see strings.tabs.accessibleName): WCAG 2.5.3 asks the visible text to be part
// of the name, so speaking either one reaches the tab, and the keyboard tests
// keep reading the tabs by the screen name.
export default function ScreenTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}) {
  return (
    <Tabs
      value={activeTab}
      onChange={(_event, value: TabId) => onTabChange(value)}
      selectionFollowsFocus
      aria-label={strings.tabs.label}
      sx={{ borderBottom: '1px solid', borderColor: 'divider', mb: 3 }}
    >
      {TABS.map((tab) => (
        <Tab
          key={tab.id}
          value={tab.id}
          id={`tab-${tab.id}`}
          aria-controls={`panel-${tab.id}`}
          aria-label={strings.tabs.accessibleName(tab.label, tab.section)}
          label={
            // One element, so the word only goes under its number on a narrow
            // screen and never on a desktop tab.
            <Box component="span" sx={{ display: 'block', lineHeight: 1.3 }}>
              {`${tab.section.number} /`}
              <Box component="br" sx={{ display: { sm: 'none' } }} />{' '}
              {tab.section.name}
            </Box>
          }
          sx={{
            // On a 320 px screen the three numbered labels share the width and
            // put the word under its number instead of running off the screen.
            flex: { xs: '1 1 0', sm: '0 0 auto' },
            minWidth: 0,
            px: { xs: 0.5, sm: 2 },
            whiteSpace: 'normal',
          }}
        />
      ))}
    </Tabs>
  )
}
