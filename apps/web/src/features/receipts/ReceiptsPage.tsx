import SearchRounded from '@mui/icons-material/SearchRounded';
import {
  HC_CATEGORIES,
  HC_CATEGORY_KEYS,
  type CategoryKey,
  type ReceiptListItem,
} from '@how-much/shared';
import Alert from '@mui/material/Alert';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import InputAdornment from '@mui/material/InputAdornment';
import Skeleton from '@mui/material/Skeleton';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { hcApi } from '../../api/hcApi';
import { EnvelopeIllustration } from '../../illustrations/EnvelopeIllustration';
import { PageHeader } from '../../layout/PageHeader';
import { formatDayHeading, formatTime, localDayKey } from '../../lib/dates';
import { useDebouncedValue } from '../../lib/useDebouncedValue';
import { hcColors } from '../../theme/hcTheme';
import { ATTENTION_KEY, AttentionList } from './AttentionList';
import { ReceiptRow } from './ReceiptRow';

const PAGE_SIZE = 30;

/** Чеки подряд, но с заголовком перед каждым новым днём. */
function groupByDay(receipts: ReceiptListItem[]) {
  const groups: { key: number; heading: string; receipts: ReceiptListItem[] }[] = [];
  for (const receipt of receipts) {
    const key = localDayKey(receipt.purchasedAt);
    const last = groups.at(-1);
    if (last?.key === key) last.receipts.push(receipt);
    else groups.push({ key, heading: formatDayHeading(receipt.purchasedAt), receipts: [receipt] });
  }
  return groups;
}

function CategoryFilter({
  value,
  onChange,
}: {
  value: CategoryKey | null;
  onChange: (category: CategoryKey | null) => void;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        overflowX: 'auto',
        mx: -0.5,
        px: 0.5,
        // Чипы листаются пальцем или колесом; полоса прокрутки тут только мешает.
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
      }}
    >
      <Chip
        label="Все"
        onClick={() => onChange(null)}
        sx={value === null ? { bgcolor: hcColors.secondaryContainer, fontWeight: 600 } : undefined}
        variant={value === null ? 'filled' : 'outlined'}
      />
      {HC_CATEGORY_KEYS.map((key) => {
        const selected = key === value;
        const meta = HC_CATEGORIES[key];
        return (
          <Chip
            key={key}
            label={meta.name}
            onClick={() => onChange(selected ? null : key)}
            variant={selected ? 'filled' : 'outlined'}
            sx={
              selected
                ? { bgcolor: meta.container, color: meta.onContainer, fontWeight: 600 }
                : undefined
            }
          />
        );
      })}
    </Box>
  );
}

function ReceiptList({ q, category }: { q: string; category: CategoryKey | null }) {
  const receipts = useInfiniteQuery({
    queryKey: ['receipts', 'list', { q, category }],
    queryFn: ({ pageParam }) =>
      hcApi.getReceipts({
        q: q || undefined,
        category: category ?? undefined,
        cursor: pageParam ?? undefined,
        limit: PAGE_SIZE,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
  });

  if (receipts.isPending) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }} aria-busy>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} variant="rounded" height={72} sx={{ borderRadius: 5 }} />
        ))}
      </Box>
    );
  }
  if (receipts.isError) {
    return (
      <Alert
        severity="error"
        action={<Button onClick={() => receipts.refetch()}>Повторить</Button>}
        sx={{ borderRadius: 4 }}
      >
        Не удалось загрузить чеки.
      </Alert>
    );
  }

  const all = receipts.data.pages.flatMap((page) => page.items);
  if (all.length === 0) {
    const filtered = Boolean(q || category);
    return (
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 7,
          py: 6,
          px: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 1.5,
        }}
      >
        <EnvelopeIllustration width={180} />
        <Typography variant="h2">{filtered ? 'Ничего не нашлось' : 'Чеков пока нет'}</Typography>
        <Typography color="text.secondary" sx={{ maxWidth: 420 }}>
          {filtered
            ? 'Попробуйте другое слово или уберите фильтр.'
            : 'Они появятся, когда в подключённой почте найдутся письма с чеками.'}
        </Typography>
        {!filtered && (
          <Button component={Link} to="/settings" variant="contained">
            Подключить почту
          </Button>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {groupByDay(all).map((group) => (
        <Box
          key={group.key}
          component="section"
          sx={{ bgcolor: 'background.paper', borderRadius: 7, p: { xs: 1.5, sm: 2 } }}
        >
          <Typography
            component="h2"
            sx={{
              px: 1.5,
              pb: 0.5,
              fontSize: 14,
              fontWeight: 600,
              color: 'text.secondary',
              '&::first-letter': { textTransform: 'uppercase' },
            }}
          >
            {group.heading}
          </Typography>
          {group.receipts.map((receipt) => (
            <ReceiptRow
              key={receipt.id}
              receipt={receipt}
              caption={formatTime(receipt.purchasedAt)}
            />
          ))}
        </Box>
      ))}
      {receipts.hasNextPage && (
        <Button
          variant="outlined"
          onClick={() => receipts.fetchNextPage()}
          loading={receipts.isFetchingNextPage}
          sx={{ alignSelf: 'center' }}
        >
          Показать ещё
        </Button>
      )}
    </Box>
  );
}

/** Список чеков (ТЗ, экран 6): поиск по товару, фильтр по категории, «Требуют внимания». */
export function ReceiptsPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'attention' ? 'attention' : 'all';
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryKey | null>(null);
  const q = useDebouncedValue(search.trim());
  const attention = useQuery({ queryKey: ATTENTION_KEY, queryFn: hcApi.getAttentionEmails });
  const attentionCount = attention.data?.length ?? 0;

  return (
    <>
      <PageHeader title="Чеки" subtitle="Все покупки из почты" />

      <Tabs
        value={tab}
        onChange={(_, value: string) => setParams(value === 'all' ? {} : { tab: value })}
        sx={{ minHeight: 44, '& .MuiTab-root': { minHeight: 44, textTransform: 'none' } }}
      >
        <Tab value="all" label="Все чеки" />
        <Tab
          value="attention"
          label={
            <Badge
              badgeContent={attentionCount}
              color="secondary"
              sx={{ pr: attentionCount > 0 ? 2 : 0, '& .MuiBadge-badge': { right: 4 } }}
            >
              Требуют внимания
            </Badge>
          }
        />
      </Tabs>

      {tab === 'attention' ? (
        <AttentionList />
      ) : (
        <>
          <TextField
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по товару или магазину"
            aria-label="Поиск по чекам"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRounded />
                  </InputAdornment>
                ),
                sx: { borderRadius: 7, bgcolor: 'background.paper' },
              },
            }}
          />
          <CategoryFilter value={category} onChange={setCategory} />
          <ReceiptList q={q} category={category} />
        </>
      )}
    </>
  );
}
