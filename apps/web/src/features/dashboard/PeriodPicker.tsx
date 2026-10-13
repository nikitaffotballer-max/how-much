import { dashboardQuerySchema, type DashboardQuery } from '@how-much/shared';
import CalendarMonthRounded from '@mui/icons-material/CalendarMonthRounded';
import CheckRounded from '@mui/icons-material/CheckRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState, type FormEvent } from 'react';
import { toDateTimeLocalValue } from '../../lib/money';
import { formatDateRange } from '../../lib/periods';
import { hcColors } from '../../theme/hcTheme';

const PRESETS = [
  { period: 'day', label: 'Сегодня' },
  { period: 'week', label: 'Неделя' },
  { period: 'month', label: 'Месяц' },
] as const;

const today = () => toDateTimeLocalValue(new Date()).slice(0, 10);

function monthAgo() {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  return toDateTimeLocalValue(date).slice(0, 10);
}

/** Свой период: две даты и проверка теми же правилами, что и на сервере. */
function CustomPeriodDialog({
  open,
  initial,
  onClose,
  onApply,
}: {
  open: boolean;
  initial: { from: string; to: string };
  onClose: () => void;
  onApply: (query: DashboardQuery) => void;
}) {
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const parsed = dashboardQuerySchema.safeParse({ period: 'custom', from, to });
  const error = parsed.success ? null : (parsed.error.issues[0]?.message ?? 'Проверьте даты');

  function submit(event: FormEvent) {
    event.preventDefault();
    if (parsed.success) onApply(parsed.data);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      slotProps={{ paper: { sx: { borderRadius: 4 } } }}
    >
      <Box component="form" noValidate onSubmit={submit}>
        <DialogTitle>Свой период</DialogTitle>
        <DialogContent sx={{ display: 'flex', gap: 2, pt: '8px !important' }}>
          <TextField
            label="С"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: today() } }}
            fullWidth
          />
          <TextField
            label="По"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: today() } }}
            fullWidth
          />
        </DialogContent>
        {error && from && to && (
          <Typography sx={{ color: 'error.main', fontSize: 13, px: 3 }}>{error}</Typography>
        )}
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose}>Отмена</Button>
          <Button type="submit" variant="contained" disabled={!parsed.success}>
            Показать
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

/** Выбор периода дашборда (ТЗ, 3.5): день, неделя, месяц или свои даты. */
export function PeriodPicker({
  value,
  onChange,
}: {
  value: DashboardQuery;
  onChange: (query: DashboardQuery) => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const custom = value.period === 'custom' ? value : null;

  const chipSx = (selected: boolean) => ({
    height: 36,
    px: 0.5,
    fontSize: 14,
    fontWeight: 500,
    borderColor: selected ? 'transparent' : hcColors.outlineVariant,
    bgcolor: selected ? hcColors.secondaryContainer : 'transparent',
    color: selected ? hcColors.onSecondaryContainer : 'text.primary',
    transition: 'background-color 200ms, border-color 200ms',
  });

  return (
    <Box
      role="group"
      aria-label="Период"
      sx={{ display: 'flex', gap: 1, overflowX: 'auto', mx: -0.5, px: 0.5, pb: 0.5 }}
    >
      {PRESETS.map((preset) => {
        const selected = value.period === preset.period;
        return (
          <Chip
            key={preset.period}
            label={preset.label}
            variant="outlined"
            icon={selected ? <CheckRounded /> : undefined}
            aria-pressed={selected}
            onClick={() => onChange({ period: preset.period })}
            sx={chipSx(selected)}
          />
        );
      })}
      <Chip
        label={custom ? formatDateRange(custom) : 'Период'}
        variant="outlined"
        icon={<CalendarMonthRounded />}
        aria-pressed={Boolean(custom)}
        onClick={() => setDialogOpen(true)}
        sx={chipSx(Boolean(custom))}
      />
      {/* key пересоздаёт окно с актуальными датами при каждом открытии. */}
      <CustomPeriodDialog
        key={String(dialogOpen)}
        open={dialogOpen}
        initial={custom ?? { from: monthAgo(), to: today() }}
        onClose={() => setDialogOpen(false)}
        onApply={(query) => {
          setDialogOpen(false);
          onChange(query);
        }}
      />
    </Box>
  );
}
