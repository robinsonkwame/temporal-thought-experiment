// A single aria-live region for short announcements such as "Copied".
let el: HTMLElement | null = null;
export function setLiveRegion(node: HTMLElement | null) { el = node; }
export function announce(message: string) {
  if (!el) return;
  el.textContent = '';
  window.setTimeout(() => { if (el) el.textContent = message; }, 30);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    if (!ok) { announce('Copy failed. Select the text and copy it.'); return false; }
  }
  announce('Copied');
  return true;
}

export function download(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
