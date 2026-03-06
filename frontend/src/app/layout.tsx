import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { QueryProvider } from '@/components/QueryProvider';

export const metadata: Metadata = {
  title: 'Adventist Church Mail System',
  description: 'Private internal email platform for churches',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <QueryProvider>
          {children}
          <Toaster position="top-right" />
        </QueryProvider>
      </body>
    </html>
  );
}
