export default function manifest() {
  return {
    name: 'ResumeLens: AI Resume Analyzer and ATS Checker',
    short_name: 'ResumeLens',
    description: 'Score your resume, find missing keywords, and get stronger bullet rewrites.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f3f6fd',
    theme_color: '#f3f6fd',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
