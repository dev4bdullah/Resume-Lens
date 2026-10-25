import './globals.css';
import { Navbar } from '@/components/Ui';
import PwaRegister from '@/components/Pwa';

export const metadata = {
  title: 'ResumeLens: AI Resume Analyzer and ATS Checker',
  description: 'Upload your resume, paste a job description, and see exactly what an ATS will catch.',
  applicationName: 'ResumeLens',
  icons: { icon: '/icons/icon-192.png', apple: '/icons/icon-192.png' },
  appleWebApp: { capable: true, title: 'ResumeLens', statusBarStyle: 'black-translucent' },
};

export const viewport = { themeColor: '#f3f6fd' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <PwaRegister />
        <Navbar />
        <main className="wrap">{children}</main>
        <footer className="foot no-print">© 2026 ResumeLens. All rights reserved.</footer>
      </body>
    </html>
  );
}
