import Script from 'next/script';

/** Meta Pixel + Google Analytics 4 + OpenAI Ads pixel.
 *
 *  Rendu uniquement sur la page publique (pas dans le layout racine) pour que
 *  les visites de l'administration ne polluent pas les statistiques.
 *  Les identifiants sont surchargeables par variables d'environnement.
 */
const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID || '2128781854394156';
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-8EVGBH43H1';
const OPENAI_PIXEL_ID =
  process.env.NEXT_PUBLIC_OPENAI_PIXEL_ID || 'VY9e5eF93NBqE48JeSTqV8';

export default function TrackingScripts() {
  return (
    <>
      {/* Meta Pixel */}
      {FB_PIXEL_ID && (
        <>
          <Script id="meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${FB_PIXEL_ID}');
fbq('track', 'PageView');`}
          </Script>
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              alt=""
              style={{ display: 'none' }}
              src={`https://www.facebook.com/tr?id=${FB_PIXEL_ID}&ev=PageView&noscript=1`}
            />
          </noscript>
        </>
      )}

      {/* OpenAI Ads pixel */}
      {OPENAI_PIXEL_ID && (
        <Script id="openai-pixel" strategy="afterInteractive">
          {`!function(w,d,s,u){if(w.oaiq)return;var q=function(){q.q.push(arguments)};q.q=[];w.oaiq=q;var j=d.createElement(s);j.async=1;j.src=u;var f=d.getElementsByTagName(s)[0];f.parentNode.insertBefore(j,f)}(window,document,"script","https://bzrcdn.openai.com/sdk/oaiq.min.js");
oaiq('init', { pixelId: '${OPENAI_PIXEL_ID}', debug: ${process.env.NODE_ENV !== 'production'} });`}
        </Script>
      )}

      {/* Google tag (gtag.js) */}
      {GA_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
          </Script>
        </>
      )}
    </>
  );
}
