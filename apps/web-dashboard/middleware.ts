import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const protectedPrefixes = ['/admin', '/store', '/dashboard'];
const publicRoutes = ['/login', '/register'];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const isProtectedRoute = protectedPrefixes.some((prefix) =>
    pathname.startsWith(prefix)
  );

  // Redirect unauthenticated users to login
  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Role-based access control for authenticated users
  if (user && isProtectedRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role;
    const url = request.nextUrl.clone();

    // pending_store_owner can only access /store/pending
    if (role === 'pending_store_owner') {
      if (pathname === '/store/pending') {
        return supabaseResponse;
      }
      url.pathname = '/store/pending';
      return NextResponse.redirect(url);
    }

    // /admin/* requires admin role
    if (pathname.startsWith('/admin') && role !== 'admin') {
      url.pathname = role === 'store_owner' ? '/store/dashboard' : '/login';
      return NextResponse.redirect(url);
    }

    // /store/* requires store_owner or admin role
    if (pathname.startsWith('/store') && role !== 'store_owner' && role !== 'admin') {
      url.pathname = role === 'admin' ? '/admin/dashboard' : '/login';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
