import '@/app/globals.css';
import ClientProviders from '@/components/ClientProviders';

export const metadata = {
  title: '思辨场',
  description: '面向本科生的教材讨论平台',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}