This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

The student KYC workspace is available under **My Documents**. Set `NEXT_PUBLIC_KYC_API_URL` to the backend API origin before starting the frontend (for local development, `http://localhost:5000`). See `../backend/README.md` for authentication, MongoDB, and private Cloudinary setup.

## Translation

The dashboard Translation page offers two Nepali-to-English methods:

- **Bhashini** sends the entered text from the Next.js server to `https://mcp.bhasini.com/v1/translate` using UTF-8 JSON. No API credentials or additional environment variables are required for the currently verified endpoint. The response's model and free-character quota are shown only when Bhashini returns them.
- **Rule-based** uses the local translator and does not make an external request. The API route defaults to this method for existing clients that send only `{ "text": "..." }`.

The translation endpoint accepts text up to 10,000 JavaScript characters. The Translation page has one Nepali input and one editable English result; the Generate Documents page currently has no document wizard or data-entry fields.

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
