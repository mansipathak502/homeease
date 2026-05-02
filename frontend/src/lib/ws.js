export function getWsUrl() {
  return process.env.NEXT_PUBLIC_API_URL
    .replace("https://", "wss://")
    .replace("http://", "ws://")
    .replace("/api", "");
}