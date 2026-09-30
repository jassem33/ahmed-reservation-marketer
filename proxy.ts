import { NextResponse, type NextRequest } from 'next/server';

// Transmet le segment de langue de l'URL (« /ar », « /ar/… ») au layout racine via un
// en-tête de requête : le layout n'a pas accès aux paramètres de route et doit
// pourtant poser `lang` / `dir` sur <html>. La validation (langue active) se fait
// dans la page et le layout, à partir de la configuration en base.
export function proxy(req: NextRequest) {
  const m = /^\/([a-z]{2,5})(?:\/|$)/i.exec(req.nextUrl.pathname);
  const headers = new Headers(req.headers);
  headers.set('x-wl-lang', m ? m[1].toLowerCase() : '');
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ['/((?!_next|api|admin|images|favicon\\.ico|icon\\.png).*)'],
};
