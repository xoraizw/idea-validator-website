import { getPageBySlug } from '@/lib/db';

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } },
) {
  const page = await getPageBySlug(params.slug);

  if (!page) {
    return new Response(
      `<!DOCTYPE html><html><head><title>Not found</title></head><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#030712;color:#9ca3af"><div style="text-align:center"><p style="font-size:3rem;margin:0">404</p><p>This page doesn't exist.</p><a href="/" style="color:#818cf8">&#8592; Back to LaunchKit</a></div></body></html>`,
      { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    );
  }

  return new Response(page.html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
