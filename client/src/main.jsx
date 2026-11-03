import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { Provider } from "react-redux"
import store from './store.js'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import "@fontsource/pretendard/400.css"; // Regular
import "@fontsource/pretendard/500.css"; // Regular
import "@fontsource/pretendard/600.css"; // Regular
import "@fontsource/pretendard/700.css"; // Bold
import "@fontsource/pretendard/800.css"; // Bold

import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/500.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/700.css";
import "@fontsource/montserrat/800.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  </StrictMode>,
)
