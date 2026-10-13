import {cp, mkdtemp, rm, readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve, join} from 'node:path';
import {spawn} from 'node:child_process';

// Pages rejects custom config paths and otherwise discovers the parent
// framework's generated Worker config. Deploy an isolated copy of this host.
const backend = JSON.parse(await readFile(resolve('backend/wrangler.json'), 'utf8'));
const staging = await mkdtemp(join(tmpdir(), 'hws-customer-host-'));
try {
  await cp(resolve('customer-host'), staging, {recursive: true});
  const child = spawn(process.execPath, [resolve('node_modules/wrangler/bin/wrangler.js'), 'pages', 'deploy', '--project-name', 'hws-customer-sites', '--branch', 'main'], {cwd: staging, stdio: 'inherit', env: {...process.env, CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID || backend.account_id}});
  process.exitCode = await new Promise((resolve, reject) => {child.on('error', reject); child.on('exit', code => resolve(code ?? 1));});
} finally {
  await rm(staging, {recursive: true, force: true});
}
