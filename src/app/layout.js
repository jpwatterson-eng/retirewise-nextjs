import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import UserInitializer from '@/components/UserInitializer';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'RetireWise',
  description: 'Your intelligent retirement portfolio advisor',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'RetireWise',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#3B82F6',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <UserInitializer>
            {children}
          </UserInitializer>
        </AuthProvider>
      </body>
    </html>
  );
}