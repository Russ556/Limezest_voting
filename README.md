# LIMEZEST Voting / 취미 영업소

취미를 영업하고 실시간 투표로 함께 해보고 싶은 취미를 고르는 서비스입니다.

## Tech Stack

- React + TypeScript + Vite
- Vercel 배포 예정
- Supabase 연동 예정

## Local Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Vercel Settings

```txt
Framework Preset: Vite
Install Command: npm install
Build Command: npm run build
Output Directory: dist
```

## Environment Variables

Vercel Project Settings → Environment Variables에 아래 값을 등록합니다.

```txt
VITE_SUPABASE_URL=https://goncvqreojkdczwammnu.supabase.co
VITE_SUPABASE_ANON_KEY=<Supabase anon public key>
```

주의: Supabase `service_role` key는 절대 프론트엔드/Vercel 공개 환경변수에 넣지 않습니다.
