import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './App';
import { hcTheme } from './theme/hcTheme';

const hcQueryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
});

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('В index.html нет элемента #root');

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={hcQueryClient}>
      <ThemeProvider theme={hcTheme}>
        <CssBaseline />
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
