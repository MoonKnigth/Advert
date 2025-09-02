// MUI Imports
import { useTheme } from '@mui/material/styles'
import { Icon } from '@iconify/react'

// Third-party Imports
import PerfectScrollbar from 'react-perfect-scrollbar'

// Type Imports
import Typography from '@mui/material/Typography'

import type { VerticalMenuContextProps } from '@menu/components/vertical-menu/Menu'

// Component Imports
import { Menu, MenuItem } from '@menu/vertical-menu'

// Hook Imports
import useVerticalNav from '@menu/hooks/useVerticalNav'

// Styled Component Imports
import StyledVerticalNavExpandIcon from '@menu/styles/vertical/StyledVerticalNavExpandIcon'

// Style Imports
import menuItemStyles from '@core/styles/vertical/menuItemStyles'
import menuSectionStyles from '@core/styles/vertical/menuSectionStyles'

type RenderExpandIconProps = {
  open?: boolean
  transitionDuration?: VerticalMenuContextProps['transitionDuration']
}

type Props = {
  scrollMenu: (container: any, isPerfectScrollbar: boolean) => void
}

const RenderExpandIcon = ({ open, transitionDuration }: RenderExpandIconProps) => (
  <StyledVerticalNavExpandIcon open={open} transitionDuration={transitionDuration}>
    <i className='bx-chevron-right' />
  </StyledVerticalNavExpandIcon>
)

const VerticalMenu = ({ scrollMenu }: Props) => {
  // Hooks
  const theme = useTheme()
  const verticalNavOptions = useVerticalNav()

  // Vars
  const { transitionDuration, isBreakpointReached } = verticalNavOptions

  const ScrollWrapper = isBreakpointReached ? 'div' : PerfectScrollbar

  return (
    // eslint-disable-next-line lines-around-comment
    /* Custom scrollbar instead of browser scroll, remove if you want browser scroll only */
    <ScrollWrapper
      {...(isBreakpointReached
        ? {
            className: 'bs-full overflow-y-auto overflow-x-hidden',
            onScroll: container => scrollMenu(container, false)
          }
        : {
            options: { wheelPropagation: false, suppressScrollX: true },
            onScrollY: container => scrollMenu(container, true)
          })}
    >
      {/* Incase you also want to scroll NavHeader to scroll with Vertical Menu, remove NavHeader from above and paste it below this comment */}
      {/* Vertical Menu */}
      <Menu
        popoutMenuOffset={{ mainAxis: 27 }}
        menuItemStyles={menuItemStyles(verticalNavOptions, theme)}
        renderExpandIcon={({ open }) => <RenderExpandIcon open={open} transitionDuration={transitionDuration} />}
        renderExpandedMenuItemIcon={{ icon: <i className='bx-bxs-circle' /> }}
        menuSectionStyles={menuSectionStyles(verticalNavOptions, theme)}
      >
        {/* <MenuItem href='/home' icon={<i className='bx-home' />}>
          Home
        </MenuItem>
        <MenuItem href='/about' icon={<i className='bx-info-circle' />}>
          About
        </MenuItem>
        <MenuItem href='/blog' icon={<i className='bx bx-book-open' />}>
          Blog
        </MenuItem> */}
        <MenuItem href='/dashboard' icon={<i className='bx-home' />}>
          <Typography variant='h6' className='mt-1'>
            Dashboard
          </Typography>
        </MenuItem>
        <MenuItem href='/add_tv' icon={<i className='bx-tv' />}>
          <Typography variant='h6' className='mt-1'>
            Add TV
          </Typography>
        </MenuItem>
        <MenuItem href='/media' icon={<i className='bx-film' />}>
          <Typography variant='h6' className='mt-1'>
            Media
          </Typography>
        </MenuItem>
        <MenuItem href='/schedules' icon={<i className='bx-calendar-event' />}>
          <Typography variant='h6' className='mt-1'>
            Schedules
          </Typography>
        </MenuItem>
        <MenuItem href='/test' icon={<Icon icon='eos-icons:atom-electron' width={24} height={24} />}>
          <Typography variant='h6'>Test</Typography>
        </MenuItem>
      </Menu>
      {/* <Menu
        popoutMenuOffset={{ mainAxis: 27 }}
        menuItemStyles={menuItemStyles(verticalNavOptions, theme)}
        renderExpandIcon={({ open }) => <RenderExpandIcon open={open} transitionDuration={transitionDuration} />}
        renderExpandedMenuItemIcon={{ icon: <i className='bx-bxs-circle' /> }}
        menuSectionStyles={menuSectionStyles(verticalNavOptions, theme)}
      >
        <GenerateVerticalMenu menuData={menuData(dictionary)} />
      </Menu> */}
    </ScrollWrapper>
  )
}

export default VerticalMenu
