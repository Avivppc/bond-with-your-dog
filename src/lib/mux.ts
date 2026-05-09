import Mux from "@mux/mux-node";

let _mux: Mux | null = null;

export function getMux() {
  if (_mux) return _mux;
  const tokenId = process.env.MUX_TOKEN_ID;
  const tokenSecret = process.env.MUX_TOKEN_SECRET;
  if (!tokenId || !tokenSecret) {
    throw new Error("MUX_TOKEN_ID / MUX_TOKEN_SECRET not configured");
  }
  _mux = new Mux({ tokenId, tokenSecret });
  return _mux;
}

/**
 * Sign a Mux playback ID for a logged-in, enrolled user.
 * Requires MUX_SIGNING_KEY_ID and MUX_SIGNING_KEY_PRIVATE (base64 PEM) in env.
 */
export async function signPlaybackId(playbackId: string, expiresInSeconds = 60 * 60 * 4) {
  const keyId = process.env.MUX_SIGNING_KEY_ID;
  const keySecret = process.env.MUX_SIGNING_KEY_PRIVATE;
  if (!keyId || !keySecret) {
    throw new Error("MUX_SIGNING_KEY_ID / MUX_SIGNING_KEY_PRIVATE not configured");
  }

  const token = await getMux().jwt.signPlaybackId(playbackId, {
    keyId,
    keySecret,
    expiration: `${expiresInSeconds}s`,
    type: "video",
  });

  return token;
}
