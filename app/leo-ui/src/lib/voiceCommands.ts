// Local, non-AI command matching for things LEO can just *do* instead of
// talking about — "open youtube", "go to gmail", etc. Anything that doesn't
// match one of these goes to the real AI reply path instead.

const SITE_ALIASES: Record<string, string> = {
  youtube: "https://www.youtube.com",
  google: "https://www.google.com",
  gmail: "https://mail.google.com",
  "google mail": "https://mail.google.com",
  facebook: "https://www.facebook.com",
  "ads manager": "https://adsmanager.facebook.com",
  "meta ads": "https://adsmanager.facebook.com",
  instagram: "https://www.instagram.com",
  whatsapp: "https://web.whatsapp.com",
  linkedin: "https://www.linkedin.com",
  calendar: "https://calendar.google.com",
  "google calendar": "https://calendar.google.com",
  drive: "https://drive.google.com",
  "google drive": "https://drive.google.com",
};

export type OpenCommand = { url: string; label: string };

/** Matches "open X" / "go to X" / "launch X" and resolves X to a URL —
 * either a known site alias, something that already looks like a domain,
 * or a Google search for whatever was said as a last resort. Returns null
 * if the text isn't an "open" style command at all. */
export function tryOpenCommand(command: string): OpenCommand | null {
  const match = command
    .trim()
    .match(/^(?:please\s+)?(?:open|go to|launch|navigate to)\s+(.+)/i);
  if (!match) return null;

  const targetRaw = match[1].trim().replace(/[.?!]+$/, "");
  if (!targetRaw) return null;
  const targetLower = targetRaw.toLowerCase();

  for (const [key, url] of Object.entries(SITE_ALIASES)) {
    if (targetLower.includes(key)) {
      const label = key.replace(/\b\w/g, (c) => c.toUpperCase());
      return { url, label };
    }
  }

  const bareDomain = targetLower.replace(/^https?:\/\//, "");
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(bareDomain)) {
    const url = targetLower.startsWith("http") ? targetRaw : `https://${targetRaw}`;
    return { url, label: targetRaw };
  }

  return {
    url: `https://www.google.com/search?q=${encodeURIComponent(targetRaw)}`,
    label: `a search for “${targetRaw}”`,
  };
}
