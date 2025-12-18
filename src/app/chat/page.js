'use client';

import AppLayout from '@/components/AppLayout';
import AIChat from '@/components/AIChat';

export default function ChatPage() {
  return (
    <AppLayout>
      <div className="h-full -m-4">
        <AIChat />
      </div>
    </AppLayout>
  );
}