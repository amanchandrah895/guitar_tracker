"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Document <html>/<head>/<body>, fonts and meta tags live in root.tsx.
// This layout only provides app-wide client context. (It previously rendered
// its own <html> inside root.tsx's <body>, which is invalid DOM nesting.)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      cacheTime: 1000 * 60 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout({ children }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
