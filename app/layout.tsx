// app/layout.tsx
import './globals.css';

export const metadata = { title: 'Diagonal  Ganging', description: 'Starter' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='es'>
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}