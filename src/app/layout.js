import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import UserInitializer from '@/components/UserInitializer';
import { MobileNav } from '@/components/MobileNav';
import { AppHeader } from '@/components/AppLayout'

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


// <body className={inter.className}>

// app/layout.js
// app/layout.js
export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full bg-gray-50 flex flex-col`}>
        <AuthProvider>
          <UserInitializer>
            {/* The wrapper fills the screen and stays fixed */}
            <div className="flex flex-col h-screen w-full fixed inset-0 overflow-hidden">
              <AppHeader />
              
              {/* CHANGE: Removed 'overflow-hidden' from main. 
                'overflow-y-auto' allows standard pages to scroll.
                'min-h-0' and 'flex-col' allow the Chat to control its own scroll.
              */}
              <main className="flex-1 flex flex-col min-h-0 pt-20 pb-16 overflow-y-auto relative">
                {children}
              </main>
              
              <MobileNav />
            </div>
          </UserInitializer>
        </AuthProvider>
      </body>
    </html>
  );
}