import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import CheckRounded from '@mui/icons-material/CheckRounded';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import {
  formatRubExact,
  HC_CATEGORIES,
  HC_CATEGORY_KEYS,
  type CategoryOption,
  type ReceiptDetail,
  type ReceiptItem,
} from '@how-much/shared';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListSubheader from '@mui/material/ListSubheader';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { hcApi } from '../../api/hcApi';
import { CategoryIcon } from '../../components/CategoryIcon';
import { ServerError } from '../../components/ServerError';
import { UserMenu } from '../../layout/UserMenu';
import { formatDateTime } from '../../lib/dates';
import { hcColors } from '../../theme/hcTheme';

const PAYMENT_LABELS: Record<string, string> = {
  card: 'Картой',
  cash: 'Наличными',
  other: 'Другой способ',
};

const quantityFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 3 });

function ReceiptHeader({ receipt }: { receipt: ReceiptDetail }) {
  const meta = HC_CATEGORIES[receipt.category];
  return (
    <Box
      component="section"
      sx={{
        bgcolor: meta.container,
        color: meta.onContainer,
        borderRadius: 4,
        p: { xs: 2.5, md: 3.5 },
        display: 'flex',
        alignItems: 'center',
        gap: 2.5,
        flexWrap: 'wrap',
      }}
    >
      <Box sx={{ bgcolor: '#FFFFFF', borderRadius: '50%', p: 0.75 }}>
        <CategoryIcon category={receipt.category} size={56} />
      </Box>
      <Box sx={{ flex: '1 1 220px', minWidth: 0 }}>
        <Typography variant="h1" component="h1" sx={{ color: hcColors.onSurface }}>
          {receipt.merchant.name}
        </Typography>
        <Typography sx={{ fontSize: 15 }}>{formatDateTime(receipt.purchasedAt)}</Typography>
        <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
          {receipt.source === 'email' && (
            <Chip size="small" label="Из почты" sx={{ bgcolor: '#FFFFFF' }} />
          )}
          {receipt.paymentType && (
            <Chip
              size="small"
              label={PAYMENT_LABELS[receipt.paymentType] ?? receipt.paymentType}
              sx={{ bgcolor: '#FFFFFF' }}
            />
          )}
        </Box>
      </Box>
      <Box sx={{ textAlign: 'right', ml: 'auto' }}>
        <Typography sx={{ fontSize: 14 }}>Итого</Typography>
        <Typography sx={{ fontSize: 34, fontWeight: 700, color: hcColors.onSurface }}>
          {formatRubExact(receipt.total)}
        </Typography>
      </Box>
    </Box>
  );
}

/** Категория позиции: чип с меню выбора. Выбор пользователя запоминается и главнее модели. */
function CategoryPicker({
  item,
  categories,
  onPick,
}: {
  item: ReceiptItem;
  categories: CategoryOption[];
  onPick: (categoryKey: string) => void;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const top = item.category?.topKey ?? 'other';
  const meta = HC_CATEGORIES[top];
  // Группы — в том же порядке, что и на дашборде.
  const groups = HC_CATEGORY_KEYS.flatMap((key) => categories.filter((c) => c.key === key));

  return (
    <>
      <Chip
        size="small"
        label={item.category?.name ?? 'Без категории'}
        onClick={(event) => setAnchor(event.currentTarget)}
        onDelete={(event) => setAnchor(event.currentTarget.closest('.MuiChip-root'))}
        deleteIcon={<ExpandMoreRounded />}
        aria-label={`Категория: ${item.category?.name ?? 'не выбрана'}. Изменить`}
        sx={{
          bgcolor: meta.container,
          color: meta.onContainer,
          '& .MuiChip-deleteIcon': { color: meta.onContainer },
        }}
      />
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        slotProps={{ paper: { sx: { borderRadius: 3, maxHeight: 420 } } }}
      >
        {groups.flatMap((group) => [
          <ListSubheader key={`${group.key}-header`} sx={{ lineHeight: '36px' }}>
            {group.name}
          </ListSubheader>,
          ...[group, ...categories.filter((c) => c.parentKey === group.key)].map((category) => (
            <MenuItem
              key={category.key}
              selected={category.key === item.category?.key}
              onClick={() => {
                setAnchor(null);
                if (category.key !== item.category?.key) onPick(category.key);
              }}
            >
              <ListItemIcon>
                {category.key === item.category?.key && <CheckRounded fontSize="small" />}
              </ListItemIcon>
              {category.parentKey ? category.name : `${category.name} — другое`}
            </MenuItem>
          )),
        ])}
      </Menu>
    </>
  );
}

function ItemsList({ receipt }: { receipt: ReceiptDetail }) {
  const queryClient = useQueryClient();
  const categories = useQuery({ queryKey: ['categories'], queryFn: hcApi.getCategories });
  const update = useMutation({
    mutationFn: hcApi.updateReceiptItem,
    // Категории меняют и итоги дашборда, и иконку в списке чеков.
    onSuccess: () => queryClient.invalidateQueries(),
  });

  return (
    <Box
      component="section"
      aria-labelledby="items-title"
      sx={{ bgcolor: 'background.paper', borderRadius: 4, p: { xs: 2, md: 3 } }}
    >
      <Typography variant="h2" id="items-title" sx={{ px: 1, pb: 1 }}>
        Покупки · {receipt.items.length}
      </Typography>
      {update.isError && (
        <Alert severity="error" sx={{ borderRadius: 3, mb: 1 }}>
          Не удалось сменить категорию. Попробуйте ещё раз.
        </Alert>
      )}
      {receipt.items.map((item) => (
        <Box
          key={item.id}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            px: 1,
            py: 1.5,
            borderTop: `1px solid ${hcColors.surfaceContainerHigh}`,
            '&:first-of-type': { borderTop: 'none' },
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 500 }}>{item.name}</Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5, flexWrap: 'wrap' }}>
              {categories.data ? (
                <CategoryPicker
                  item={item}
                  categories={categories.data}
                  onPick={(categoryKey) => update.mutate({ id: item.id, categoryKey })}
                />
              ) : (
                <Chip size="small" label={item.category?.name ?? 'Без категории'} />
              )}
              <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                {quantityFormatter.format(item.quantity)} × {formatRubExact(item.price)}
              </Typography>
            </Box>
          </Box>
          <Typography sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
            {formatRubExact(item.sum)}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

/** Карточка чека (ТЗ, экран 7). */
export function ReceiptPage() {
  const { id = '' } = useParams();
  const receipt = useQuery({
    queryKey: ['receipts', 'detail', id],
    queryFn: () => hcApi.getReceipt(id),
  });
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const remove = useMutation({
    mutationFn: hcApi.deleteReceipt,
    onSuccess: async () => {
      navigate('/receipts', { replace: true });
      await queryClient.invalidateQueries();
    },
  });

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minHeight: 64 }}>
        <IconButton component={Link} to="/receipts" aria-label="Назад к чекам">
          <ArrowBackRounded />
        </IconButton>
        <Typography sx={{ flex: 1, fontWeight: 600 }}>Чек</Typography>
        {receipt.data && (
          <Tooltip title="Удалить чек">
            <IconButton aria-label="Удалить чек" onClick={() => setConfirmOpen(true)}>
              <DeleteOutlineRounded />
            </IconButton>
          </Tooltip>
        )}
        <UserMenu />
      </Box>

      {receipt.isPending && (
        <>
          <Skeleton variant="rounded" height={140} sx={{ borderRadius: 4 }} />
          <Skeleton variant="rounded" height={280} sx={{ borderRadius: 4 }} />
        </>
      )}

      {receipt.isError && (
        <Alert
          severity="error"
          action={
            <Button component={Link} to="/receipts">
              К списку
            </Button>
          }
          sx={{ borderRadius: 3 }}
        >
          Чек не найден или не загрузился.
        </Alert>
      )}

      {receipt.data && (
        <>
          <ReceiptHeader receipt={receipt.data} />
          <ItemsList receipt={receipt.data} />
          {receipt.data.fiscal && (
            <Typography sx={{ fontSize: 13, color: 'text.secondary', px: 1 }}>
              {receipt.data.merchant.legalName && `${receipt.data.merchant.legalName} · `}
              {receipt.data.merchant.inn && `ИНН ${receipt.data.merchant.inn} · `}
              ФН {receipt.data.fiscal.fn} · ФД {receipt.data.fiscal.fd}
              {receipt.data.fiscal.fpd && ` · ФП ${receipt.data.fiscal.fpd}`}
            </Typography>
          )}
        </>
      )}

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        slotProps={{ paper: { sx: { borderRadius: 4 } } }}
      >
        <DialogTitle>Удалить чек?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Покупки из него пропадут из статистики. Письмо из почты заново не загрузится.
          </DialogContentText>
          <ServerError error={remove.error} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setConfirmOpen(false)}>Отмена</Button>
          <Button
            variant="contained"
            color="error"
            loading={remove.isPending}
            onClick={() => remove.mutate(id)}
          >
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
