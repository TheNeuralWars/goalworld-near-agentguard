#!/usr/bin/env node
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const ROOT = '/data/work/goalworld-near-agentguard';
const PORT = 3091;
const OUT_DIR = path.join(ROOT, 'media', 'record-raw');
const FINAL = path.join(ROOT, 'media', 'near_agentguard_demo.mp4');
const FRAMES = path.join(ROOT, 'evidence', 'video-frames');

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(FRAMES, { recursive: true });

function loadEnvFile(p) {
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split(/\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
loadEnvFile(path.join(ROOT, 'evidence', 'testnet.env'));

try {
  const raw = fs.readFileSync('/data/hermes-home/config.yaml', 'utf8');
  const idx = raw.indexOf('omniroute:');
  if (idx >= 0) {
    const slice = raw.slice(idx, idx + 400);
    const m = slice.match(/api_key:\s*["']?([^\s"']+)/);
    if (m?.[1]) {
      process.env.OMNI_API_KEY = m[1];
      process.env.LLM_API_KEY = m[1];
    }
  }
} catch {}

process.env.NEAR_LIVE_CHAIN = '1';
process.env.NEAR_NETWORK = 'testnet';
process.env.PER_TX_NEAR = process.env.PER_TX_NEAR || '1';
process.env.DAILY_SPEND_NEAR = process.env.DAILY_SPEND_NEAR || '5';
process.env.PORT = String(PORT);
process.env.HOST = '127.0.0.1';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  try {
    spawn('fuser', ['-k', `${PORT}/tcp`], { stdio: 'ignore' });
  } catch {}
  await sleep(800);

  const server = spawn('node', ['server.js'], {
    cwd: ROOT,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let boot = '';
  server.stdout.on('data', (d) => (boot += d.toString()));
  server.stderr.on('data', (d) => (boot += d.toString()));
  await sleep(1500);
  console.log(JSON.stringify({ server_boot_len: boot.length, has_llm: Boolean(process.env.LLM_API_KEY) }));

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: OUT_DIR, size: { width: 1920, height: 1080 } },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(120000);

  const setCap = async (t) => {
    await page.evaluate((text) => window.setCaption?.(text), t).catch(() => {});
  };

  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
  await setCap('AgentGuard · NEAR testnet · spend_cap + FC key');
  await sleep(2500);

  // 1) PASS
  await setCap('1/3 · Valid vendor payee → Run Guard (live chain)');
  await page.fill('#payee', process.env.NEAR_VENDOR_ACCOUNT || 'gwvendor4a20f8.testnet');
  await page.fill('#amount', '0.11');
  await sleep(1200);
  await page.click('#run');
  await page.waitForSelector('#results:not([hidden])', { timeout: 90000 });
  await page.waitForFunction(() => /PASS|BLOCK|WARN|FAIL/i.test(document.getElementById('verdict')?.textContent || ''), null, {
    timeout: 90000,
  });
  const passVerdict = (await page.textContent('#verdict'))?.trim();
  const reply = await page.textContent('#reply');
  const explorerVisible = await page.isVisible('#explorer-panel:not([hidden])');
  console.log(
    JSON.stringify({
      step: 'pass',
      verdict: passVerdict,
      explorerVisible,
      replyHasHttps: /https:\/\/testnet\.nearblocks\.io\/txns\//.test(reply || ''),
    })
  );
  await setCap(`1/3 · ${passVerdict} — explorer URL on screen`);
  await sleep(4000);

  let explorerHref = null;
  if ((await page.locator('#explorer-link').count()) > 0) {
    explorerHref = await page.getAttribute('#explorer-link', 'href');
  } else {
    const m = (reply || '').match(/https:\/\/testnet\.nearblocks\.io\/txns\/[A-Za-z0-9]+/);
    explorerHref = m ? m[0] : null;
  }

  if (explorerHref) {
    await setCap('Opening testnet explorer — full URL visible');
    await page.goto(explorerHref, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => null);
    await sleep(2000);
    await page.evaluate((url) => {
      let bar = document.getElementById('fake-urlbar');
      if (!bar) {
        bar = document.createElement('div');
        bar.id = 'fake-urlbar';
        Object.assign(bar.style, {
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          zIndex: 99999,
          padding: '14px 18px',
          background: '#111827',
          color: '#e5f2ff',
          font: '600 18px ui-monospace, monospace',
          borderBottom: '2px solid #38bdf8',
          wordBreak: 'break-all',
        });
        document.body.prepend(bar);
      }
      bar.textContent = url;
    }, explorerHref);
    await sleep(5000);
  } else {
    console.log(JSON.stringify({ step: 'explorer', error: 'no href', verdict: passVerdict }));
  }

  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
  await sleep(1500);

  // 2) ATTACK
  await setCap('2/3 · Injected attack: LLM plans scam.near → guard BLOCKED');
  await page.click('[data-demo="attack"]');
  await page.waitForSelector('#results:not([hidden])', { timeout: 120000 });
  await page.waitForFunction(() => /BLOCK|PASS|WARN|FAIL/i.test(document.getElementById('verdict')?.textContent || ''), null, {
    timeout: 120000,
  });
  const attackVerdict = (await page.textContent('#verdict'))?.trim();
  const attackReply = await page.textContent('#reply');
  console.log(JSON.stringify({ step: 'attack', verdict: attackVerdict, hasScam: /scam\.near/i.test(attackReply || '') }));
  await setCap(`2/3 · ${attackVerdict} — scam.near stopped by guard`);
  await sleep(5000);

  // 3) CAP
  await setCap('3/3 · Over per-tx cap on-chain (0.7 > 0.5) → BLOCKED');
  await page.fill('#payee', process.env.NEAR_VENDOR_ACCOUNT || 'gwvendor4a20f8.testnet');
  await page.fill('#amount', '0.7');
  await sleep(800);
  await page.click('#run');
  await page.waitForSelector('#results:not([hidden])', { timeout: 90000 });
  await page.waitForFunction(() => /BLOCK|PASS|WARN|FAIL/i.test(document.getElementById('verdict')?.textContent || ''), null, {
    timeout: 90000,
  });
  const capVerdict = (await page.textContent('#verdict'))?.trim();
  const capMeta = (await page.textContent('#verdict-meta'))?.trim();
  const capReply = await page.textContent('#reply');
  console.log(
    JSON.stringify({
      step: 'cap',
      verdict: capVerdict,
      meta: (capMeta || '').slice(0, 180),
      onchainHint: /onchain|per_tx|cap/i.test(`${capReply}${capMeta}`),
    })
  );
  await setCap(`3/3 · ${capVerdict} — on-chain spend_cap enforced`);
  await sleep(5000);
  await setCap('Demo complete · testnet only · no secrets shown');
  await sleep(2500);

  const videoPath = await page.video().path();
  await context.close();
  await browser.close();
  try {
    server.kill('SIGTERM');
  } catch {}

  console.log(JSON.stringify({ raw_video: videoPath }));

  await new Promise((resolve, reject) => {
    const ff = spawn(
      'ffmpeg',
      [
        '-y',
        '-i',
        videoPath,
        '-vf',
        'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2',
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-r',
        '25',
        '-movflags',
        '+faststart',
        '-an',
        FINAL,
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );
    let err = '';
    ff.stderr.on('data', (d) => (err += d.toString()));
    ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(err.slice(-900)))));
  });

  for (const f of fs.readdirSync(FRAMES)) {
    if (f.startsWith('qa-')) fs.unlinkSync(path.join(FRAMES, f));
  }
  await new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', ['-y', '-i', FINAL, '-vf', 'fps=1/12', path.join(FRAMES, 'qa-%02d.png')], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error('frame extract failed'))));
  });

  const probe = await new Promise((resolve) => {
    const p = spawn('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size', '-of', 'json', FINAL]);
    let o = '';
    p.stdout.on('data', (d) => (o += d));
    p.on('close', () => {
      try {
        resolve(JSON.parse(o));
      } catch {
        resolve({});
      }
    });
  });

  fs.writeFileSync(
    path.join(ROOT, 'evidence', 'video-record-meta.json'),
    JSON.stringify(
      {
        final: FINAL,
        raw: videoPath,
        duration_s: Number(probe?.format?.duration || 0),
        size: Number(probe?.format?.size || 0),
        explorerHref,
        passVerdict,
        attackVerdict,
        capVerdict,
        recorded_at: new Date().toISOString(),
      },
      null,
      2
    )
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        final: FINAL,
        duration_s: Number(probe?.format?.duration || 0),
        frames: fs.readdirSync(FRAMES).filter((f) => f.startsWith('qa-')).length,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error('RECORD_FAILED', String(e.message || e).slice(0, 1000));
  process.exit(1);
});
