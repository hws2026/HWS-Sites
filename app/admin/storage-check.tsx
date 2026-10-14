'use client';
import {useState} from 'react';
import {apiFetch} from '@/lib/client-runtime';

export function StorageCheck() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{message:string;ok:boolean}|null>(null);
  async function check() {
    setBusy(true); setResult(null);
    try {
      const response = await apiFetch('/api/admin', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action:'check-storage'})});
      const body = await response.json() as {message?:string;error?:string};
      if (!response.ok) throw new Error(body.error || 'Storage connection test failed. Please retry.');
      setResult({ok:true,message:body.message || 'Storage connected.'});
    } catch (error) {
      setResult({ok:false,message:error instanceof Error?error.message:'Storage connection test failed. Please retry.'});
    } finally { setBusy(false); }
  }
  return <><h2>Media storage</h2><p>Images, videos, and PDFs can use up to 50 MB per file. Oversized images are automatically optimized before upload.</p><button className="button" onClick={()=>void check()} disabled={busy}>{busy?'Checking storage…':'Test storage connection'}</button>{result&&<p role={result.ok?'status':'alert'}>{result.message}</p>}<div className="settings-divider"/></>;
}
