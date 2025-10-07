// A lightweight canvas-based composer to render the Vibranium ticket PNG
// with participant name, ID, and QR code placed at precise coordinates.

export interface ComposeTicketInput {
  backgroundSrc: string; // path or data URL
  participantName: string;
  participantId: string;
  qrCodeDataURL: string; // data URL of QR PNG
}

export async function composeVibraniumTicket({
  backgroundSrc,
  participantName,
  participantId,
  qrCodeDataURL,
}: ComposeTicketInput): Promise<string> {
  const bgImage = await loadImage(backgroundSrc);
  const qrImage = await loadImage(qrCodeDataURL);

  const width = bgImage.width;
  const height = bgImage.height;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  // Draw background
  ctx.drawImage(bgImage, 0, 0, width, height);

  // Typography settings based on artwork (approximate)
  // Name and ID sit on the left block; use white text to match design
  ctx.fillStyle = '#FFFFFF';
  ctx.textBaseline = 'top';

  // Asap Condensed approximation using system fallback
  // Participant Name label
  ctx.font = '600 28px "Asap Condensed", system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#EFC5FF';
  ctx.fillText('Participant Name:', 60, 112);

  // Participant Name value
  ctx.font = '500 34px "Asap Condensed", system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  drawWrappedText(ctx, participantName, 60, 150, 300, 36);

  // Participant ID label
  ctx.font = '600 28px "Asap Condensed", system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#EFC5FF';
  ctx.fillText('Participant ID:', 60, 208);

  // Participant ID value
  ctx.font = '500 32px "Asap Condensed", system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  drawWrappedText(ctx, participantId, 60, 244, 300, 34);

  // QR code placement inside the light rounded square
  // The artwork square is ~326x326 at (41, 344). We inset a margin for aesthetics.
  const qrTargetSize = 280; // keep some padding
  const qrX = 41 + (326 - qrTargetSize) / 2;
  const qrY = 344 + (326 - qrTargetSize) / 2;
  ctx.drawImage(qrImage, qrX, qrY, qrTargetSize, qrTargetSize);

  return canvas.toDataURL('image/png');
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(/\s+/);
  let line = '';
  let drawY = y;

  for (let i = 0; i < words.length; i++) {
    const testLine = line ? line + ' ' + words[i] : words[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line, x, drawY);
      line = words[i];
      drawY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) ctx.fillText(line, x, drawY);
}

export default composeVibraniumTicket;

