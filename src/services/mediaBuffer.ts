interface MediaEntry {
  data: string;
  mimeType: string;
}

let latest: MediaEntry | undefined;

export function setMedia(entry: MediaEntry): void {
  latest = entry;
}

export function takeMedia(): MediaEntry | undefined {
  const entry = latest;
  latest = undefined;
  return entry;
}
