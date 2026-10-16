import {useEffect} from 'react';
import {assetUrl,appHref} from '@/lib/client-runtime';
import {Monitor} from 'lucide-react';
import {DESKTOP_REQUIRED_MESSAGE} from '@/lib/device-access';

export function DesktopRequired() {
  useEffect(() => { document.title = 'Desktop access required | Husky Suite'; }, []);
  return <main className="auth-screen">
    <div className="brand"><img className="husky-suite-logo" src={assetUrl('/husky-suite-logo.png')} alt="Husky Suite"/></div>
    <div className="auth-card" role="alert">
      <Monitor size={40} aria-hidden="true"/>
      <span className="auth-site-label">DESKTOP ACCESS ONLY</span>
      <h1>Use a computer for this feature</h1>
      <p>{DESKTOP_REQUIRED_MESSAGE}</p>
      <a className="button primary" href={appHref('/mobile')}>Open mobile workspace</a>
    </div>
  </main>;
}
