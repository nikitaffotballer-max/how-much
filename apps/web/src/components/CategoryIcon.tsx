import { HC_CATEGORIES, type CategoryKey } from '@how-much/shared';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import HomeRounded from '@mui/icons-material/HomeRounded';
import Inventory2Rounded from '@mui/icons-material/Inventory2Rounded';
import LocalCafeRounded from '@mui/icons-material/LocalCafeRounded';
import MonitorHeartRounded from '@mui/icons-material/MonitorHeartRounded';
import ShoppingBasketRounded from '@mui/icons-material/ShoppingBasketRounded';
import type { SvgIconComponent } from '@mui/icons-material';
import Box from '@mui/material/Box';

const ICONS: Record<CategoryKey, SvgIconComponent> = {
  groceries: ShoppingBasketRounded,
  marketplaces: Inventory2Rounded,
  cafe: LocalCafeRounded,
  health: MonitorHeartRounded,
  home: HomeRounded,
  other: AutoAwesomeRounded,
};

interface CategoryIconProps {
  category: CategoryKey;
  /** Диаметр кружка в пикселях. */
  size?: number;
}

/** Иконка категории в цветном кружке — как в макете. */
export function CategoryIcon({ category, size = 44 }: CategoryIconProps) {
  const Icon = ICONS[category];
  const { container, onContainer } = HC_CATEGORIES[category];
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        bgcolor: container,
        color: onContainer,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 'none',
      }}
    >
      <Icon sx={{ fontSize: size * 0.55 }} />
    </Box>
  );
}
