# Install walkthrough video sources

The demo videos in `public/videos/install-{ios,ios26,ios-chrome,android}.mp4` (shown step by step in
the member app's "Install app" guide, `src/components/app/install/InstallGuide.tsx`) are rendered from
these scenes: deterministic HTML timelines where every visual property is a pure function of t (ms).
Ported from SkiFit's install flow and rebranded for Bonded. Re-render when iOS/Chrome UI changes:

```
npm i playwright-core        # anywhere outside the app, once
node driver.mjs ios frames-ios
ffmpeg -framerate 30 -i frames-ios/f%04d.png -vf scale=720:920 \
  -c:v libx264 -pix_fmt yuv420p -crf 27 -preset slow -movflags +faststart \
  -an install-ios.mp4
ffmpeg -y -ss 0.6 -i install-ios.mp4 -vframes 1 -q:v 4 install-ios-poster.jpg
```

Same for ios26, ios-chrome and android. Posters at -ss 0.6 (frame 0 is the loop fade). The step
slices in InstallGuide.tsx (`slice: [start, end]` seconds) must match each scene's timeline.

The scenes load `icon-192.png` (the app icon, from src/app/apple-icon.png), `logo.png` and
`app-home-1.jpeg` (a photo from public/app/img) from this folder.

Preview single frames while editing: `node driver.mjs ios preview 900,3300`.
