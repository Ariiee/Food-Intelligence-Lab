This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Accessing the dev UI from other devices on your LAN

If you want to open the development server from another device (phone, tablet, another PC) on the same network, follow these steps:

1. Start the dev server bound to all interfaces:

```powershell
# Windows PowerShell
$env:HOST='0.0.0.0'
npm run dev:host
```

2. Or run the host script directly:

```powershell
npm run dev:host
```

3. If you still see blank charts or missing content when accessing via the LAN IP (for example `http://192.168.1.3:3000`), either:

- Use the production server which avoids HMR websocket handshakes:

```powershell
npm run build
$env:HOST='0.0.0.0'
npm run start
```

- Or allow port `3000` through Windows Firewall (Admin PowerShell):

```powershell
New-NetFirewallRule -DisplayName "Allow Node 3000" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000
```

4. If you want a permanent npm script that starts on all hosts, `dev:host` is already added to `package.json` as:

```json
"dev:host": "next dev -H 0.0.0.0"
```

These steps fix common issues where the dev server's HMR websocket rejects remote connections, which can cause partial UI initialization on remote browsers.
