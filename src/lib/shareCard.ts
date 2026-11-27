/**
 * Draws a 1080 x 1920 story card (Instagram / WhatsApp status size) on a
 * canvas in the browser and downloads it as a PNG. No server, no libraries.
 * Used by Your Life results and the quiz score card.
 */
import { site } from '@/data/site';

export interface StoryCard {
  filename: string;
  kicker: string;
  title: string;
  /** Big route line on the ticket, e.g. DEL -> FRA */
  from: string;
  to: string;
  rows: { label: string; value: string }[];
  /** Italic line at the bottom of the ticket. */
  quote?: string;
}

const W = 1080;
const H = 1920;
const C = { ink: '#2B1B3D', night: '#0D0F3A', sun: '#FFB72B', tang: '#FF7A45', coral: '#FF5A6E', cream: '#FFF4E0', teal: '#E84A7F', sky: '#8A5CF6' };

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  text.split(' ').forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = test;
  });
  if (line) lines.push(line);
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function renderStoryCard(card: StoryCard): Promise<HTMLCanvasElement> {
  // Make sure the brand fonts are ready before drawing text.
  await Promise.all([
    document.fonts.load('800 96px "Bricolage Grotesque Variable"'),
    document.fonts.load('600 40px "DM Sans Variable"'),
    document.fonts.load('500 30px "JetBrains Mono Variable"'),
  ]).catch(() => undefined);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Night sky
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, C.night);
  sky.addColorStop(0.55, C.ink);
  sky.addColorStop(1, '#3a2470');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Stars (fixed positions so every card looks the same)
  ctx.fillStyle = 'rgba(255,244,224,.7)';
  for (let i = 0; i < 90; i++) {
    const x = (i * 197) % W;
    const y = (i * 331) % 760;
    ctx.fillRect(x, y, i % 7 === 0 ? 4 : 2, i % 7 === 0 ? 4 : 2);
  }

  // Retro sun with horizon slits
  const sunY = 250;
  const sunR = 175;
  const sun = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
  sun.addColorStop(0, C.sun);
  sun.addColorStop(0.55, C.tang);
  sun.addColorStop(1, C.coral);
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(W / 2, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.night;
  [[32, 8], [66, 12], [102, 17], [142, 24]].forEach(([dy, h]) => ctx.fillRect(W / 2 - sunR - 20, sunY + dy, sunR * 2 + 40, h));

  // Heading: shrink the title until it fits on one line
  ctx.textAlign = 'center';
  ctx.fillStyle = C.sky;
  ctx.font = '500 34px "JetBrains Mono Variable", monospace';
  ctx.fillText(card.kicker.toUpperCase(), W / 2, 505);
  ctx.fillStyle = C.cream;
  let titleSize = 92;
  do {
    ctx.font = `800 ${titleSize}px "Bricolage Grotesque Variable", Arial, sans-serif`;
    titleSize -= 4;
  } while (ctx.measureText(card.title).width > 960 && titleSize > 40);
  ctx.fillText(card.title, W / 2, 610);

  // Ticket
  const tx = 70;
  const ty = 680;
  const tw = W - 140;
  const rowH = 98;
  const th = 330 + card.rows.length * rowH + (card.quote ? 180 : 20);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.45)';
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 24;
  ctx.fillStyle = C.cream;
  roundRect(ctx, tx, ty, tw, th, 44);
  ctx.fill();
  ctx.restore();

  // Teal band
  ctx.save();
  roundRect(ctx, tx, ty, tw, th, 44);
  ctx.clip();
  ctx.fillStyle = C.teal;
  ctx.fillRect(tx, ty, tw, 84);
  ctx.restore();
  ctx.fillStyle = C.ink;
  ctx.textAlign = 'left';
  ctx.font = '500 30px "JetBrains Mono Variable", monospace';
  ctx.fillText('BOARDING PASS', tx + 48, ty + 54);
  ctx.textAlign = 'right';
  ctx.fillText('PASSPORT STORIES', tx + tw - 48, ty + 54);

  // Route
  ctx.fillStyle = C.ink;
  ctx.font = '800 110px "Bricolage Grotesque Variable", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(card.from, tx + 48, ty + 230);
  ctx.textAlign = 'right';
  ctx.fillText(card.to, tx + tw - 48, ty + 230);
  // Dotted flight arc between the two codes, sized to the space left over.
  const arcStart = tx + 48 + ctx.measureText(card.from).width + 36;
  const arcEnd = tx + tw - 48 - ctx.measureText(card.to).width - 36;
  if (arcEnd - arcStart > 140) {
    const mid = (arcStart + arcEnd) / 2;
    ctx.strokeStyle = C.tang;
    ctx.lineWidth = 6;
    ctx.setLineDash([4, 18]);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(arcStart, ty + 200);
    ctx.quadraticCurveTo(mid, ty + 110, arcEnd, ty + 200);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.textAlign = 'center';
    ctx.font = '60px sans-serif';
    ctx.fillStyle = C.coral;
    ctx.fillText('✈', mid, ty + 172);
  }

  // Rows
  let y = ty + 310;
  card.rows.forEach((row) => {
    ctx.strokeStyle = 'rgba(27,31,94,.18)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tx + 48, y - 40);
    ctx.lineTo(tx + tw - 48, y - 40);
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(27,31,94,.7)';
    ctx.font = '500 28px "JetBrains Mono Variable", monospace';
    ctx.fillText(row.label.toUpperCase(), tx + 48, y + 8);
    ctx.textAlign = 'right';
    ctx.fillStyle = C.ink;
    ctx.font = '700 46px "DM Sans Variable", sans-serif';
    ctx.fillText(row.value, tx + tw - 48, y + 14);
    y += rowH;
  });

  // Perforation and quote
  if (card.quote) {
    ctx.strokeStyle = 'rgba(27,31,94,.35)';
    ctx.lineWidth = 4;
    ctx.setLineDash([14, 14]);
    ctx.beginPath();
    ctx.moveTo(tx + 30, y - 30);
    ctx.lineTo(tx + tw - 30, y - 30);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = sky;
    [tx, tx + tw].forEach((cx) => {
      ctx.beginPath();
      ctx.arc(cx, y - 30, 26, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = C.ink;
    ctx.textAlign = 'center';
    ctx.font = 'italic 500 36px "DM Sans Variable", sans-serif';
    wrap(ctx, card.quote, tw - 120)
      .slice(0, 3)
      .forEach((l, i) => ctx.fillText(l, W / 2, y + 40 + i * 48));
  }

  // Footer
  ctx.textAlign = 'center';
  ctx.fillStyle = C.sun;
  ctx.font = '800 54px "Bricolage Grotesque Variable", Arial, sans-serif';
  ctx.fillText('PASSPORT STORIES', W / 2, H - 150);
  ctx.fillStyle = C.cream;
  ctx.font = '500 32px "JetBrains Mono Variable", monospace';
  ctx.fillText(`${site.tagline}  ${site.social.handle}`, W / 2, H - 92);

  return canvas;
}

/** Render the card and trigger a PNG download. */
export async function downloadStoryCard(card: StoryCard) {
  const canvas = await renderStoryCard(card);
  const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/png'));
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = card.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
