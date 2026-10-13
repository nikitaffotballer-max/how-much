import { HC_CATEGORIES, HC_CATEGORY_KEYS, type CategoryKey } from '@how-much/shared';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { hcApi } from '../../api/hcApi';
import { CategoryIcon } from '../../components/CategoryIcon';
import { ServerError } from '../../components/ServerError';
import { parseRublesInput, toDateTimeLocalValue } from '../../lib/money';
import { hcColors } from '../../theme/hcTheme';

interface AddCashDialogProps {
  open: boolean;
  onClose: () => void;
}

/** Выбор категории одним нажатием: шесть кружков вместо выпадающего списка. */
function CategoryChoice({
  value,
  onChange,
}: {
  value: CategoryKey | null;
  onChange: (key: CategoryKey) => void;
}) {
  return (
    <Box
      role="radiogroup"
      aria-label="Категория"
      sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}
    >
      {HC_CATEGORY_KEYS.map((key) => {
        const selected = key === value;
        return (
          <ButtonBase
            key={key}
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(key)}
            sx={{
              flexDirection: 'column',
              gap: 0.75,
              py: 1.25,
              borderRadius: 3,
              border: '2px solid',
              borderColor: selected ? hcColors.primary : 'transparent',
              bgcolor: selected ? hcColors.heroContainer : hcColors.surfaceContainer,
              fontSize: 13,
              fontWeight: selected ? 600 : 500,
            }}
          >
            <CategoryIcon category={key} size={36} />
            {HC_CATEGORIES[key].name}
          </ButtonBase>
        );
      })}
    </Box>
  );
}

/** Трата наличными (ТЗ, экран 6): сумма, что купили, категория и время. */
export function AddCashDialog({ open, onClose }: AddCashDialogProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<CategoryKey | null>(null);
  const [purchasedAt, setPurchasedAt] = useState(() => toDateTimeLocalValue(new Date()));
  const [submitted, setSubmitted] = useState(false);

  const create = useMutation({
    mutationFn: hcApi.createCashReceipt,
    onSuccess: async (receipt) => {
      await queryClient.invalidateQueries();
      onClose();
      navigate(`/receipts/${receipt.id}`);
    },
  });

  const kopecks = parseRublesInput(amount);
  const errors = {
    amount: kopecks === null || kopecks === 0 ? 'Введите сумму, например 1 250,50' : null,
    title: title.trim() === '' ? 'Напишите, что купили' : null,
    category: category === null ? 'Выберите категорию' : null,
  };

  function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (errors.amount || errors.title || !category || !kopecks) return;
    create.mutate({
      title: title.trim(),
      amount: kopecks,
      purchasedAt: new Date(purchasedAt).toISOString(),
      categoryKey: category,
    });
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
        <DialogTitle>Трата наличными</DialogTitle>
        <DialogContent
          sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '8px !important' }}
        >
          <TextField
            label="Сумма"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            autoFocus
            error={submitted && Boolean(errors.amount)}
            helperText={submitted ? errors.amount : null}
            slotProps={{
              htmlInput: { inputMode: 'decimal' },
              input: { endAdornment: <InputAdornment position="end">₽</InputAdornment> },
            }}
          />
          <TextField
            label="Что купили"
            placeholder="Рынок, овощи"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            error={submitted && Boolean(errors.title)}
            helperText={submitted ? errors.title : null}
          />
          <Box>
            <CategoryChoice value={category} onChange={setCategory} />
            {submitted && errors.category && (
              <Typography sx={{ color: 'error.main', fontSize: 12, mt: 0.75, ml: 1.75 }}>
                {errors.category}
              </Typography>
            )}
          </Box>
          <TextField
            label="Когда"
            type="datetime-local"
            value={purchasedAt}
            onChange={(event) => setPurchasedAt(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <ServerError error={create.error} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose}>Отмена</Button>
          <Button type="submit" variant="contained" loading={create.isPending}>
            Добавить
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
