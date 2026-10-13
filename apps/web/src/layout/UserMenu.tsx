import LogoutRounded from '@mui/icons-material/LogoutRounded';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { useState } from 'react';
import { useCurrentUser, useLogout } from '../features/auth/useCurrentUser';
import { hcColors } from '../theme/hcTheme';

/** Аватар с первой буквой email и меню «Выйти». */
export function UserMenu() {
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  if (!user) return null;

  return (
    <>
      <IconButton
        aria-label="Меню профиля"
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        onClick={(event) => setAnchor(event.currentTarget)}
      >
        <Avatar
          sx={{
            bgcolor: hcColors.secondaryContainer,
            color: hcColors.onSecondaryContainer,
            fontWeight: 600,
          }}
        >
          {user.email[0]?.toUpperCase()}
        </Avatar>
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { borderRadius: 3, minWidth: 240 } } }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Box sx={{ fontSize: 13, color: 'text.secondary' }}>Вы вошли как</Box>
          <Box sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user.email}
          </Box>
        </Box>
        <Divider />
        <MenuItem onClick={() => logout.mutate()} disabled={logout.isPending}>
          <ListItemIcon>
            <LogoutRounded fontSize="small" />
          </ListItemIcon>
          Выйти
        </MenuItem>
      </Menu>
    </>
  );
}
