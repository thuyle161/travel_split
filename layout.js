export const metadata = {
  title: 'Chia tiền du lịch',
  description: 'App chia tiền cho nhóm du lịch',
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: '#f5f5f7' }}>
        {children}
      </body>
    </html>
  );
}
