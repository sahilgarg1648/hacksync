import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'HackSync — Find Your Perfect Hackathon Team',
  description: 'Intelligent teammate matching for developers. Find compatible hackathon partners based on skills, interests, and availability.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.className} bg-[#07060d] text-white antialiased min-h-screen overflow-x-hidden`}>
        {children}
        <Toaster position="top-right" theme="dark" richColors />
      </body>
    </html>
  );
}
