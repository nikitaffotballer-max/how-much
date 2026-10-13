import { formatRub, type ReceiptListItem } from '@how-much/shared';
import PaymentsRounded from '@mui/icons-material/PaymentsRounded';
import Box from '@mui/material/Box';
import { Link } from 'react-router';
import { CategoryIcon } from '../../components/CategoryIcon';
import { hcColors } from '../../theme/hcTheme';

/** Наличные показываем иконкой купюры, а не категорией: так сразу видно, что чека нет. */
function PurchaseIcon({ receipt }: { receipt: ReceiptListItem }) {
  if (receipt.source !== 'cash') return <CategoryIcon category={receipt.category} size={48} />;
  return (
    <Box
      sx={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        bgcolor: '#E2F3E8',
        color: hcColors.primary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 'none',
      }}
    >
      <PaymentsRounded />
    </Box>
  );
}

interface ReceiptRowProps {
  receipt: ReceiptListItem;
  /** Подпись под магазином: время или дата — зависит от того, сгруппирован ли список по дням. */
  caption: string;
}

/** Строка чека: иконка категории, магазин, что купили, сумма. Ведёт в карточку чека. */
export function ReceiptRow({ receipt, caption }: ReceiptRowProps) {
  return (
    <Box
      component={Link}
      to={`/receipts/${receipt.id}`}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        minHeight: 72,
        px: 1.5,
        borderRadius: 5,
        color: 'text.primary',
        textDecoration: 'none',
        '&:hover': { bgcolor: hcColors.background },
      }}
    >
      <PurchaseIcon receipt={receipt} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ fontSize: 16, fontWeight: 600 }}>{receipt.merchant}</Box>
        <Box
          sx={{
            fontSize: 14,
            color: 'text.secondary',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {caption} · {receipt.itemsPreview}
        </Box>
      </Box>
      <Box sx={{ fontSize: 17, fontWeight: 700, whiteSpace: 'nowrap' }}>
        {formatRub(receipt.total)}
      </Box>
    </Box>
  );
}
