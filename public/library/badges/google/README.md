# Google Play badges

**Google's own artwork**, downloaded by `pnpm fetch-store-badges`. Google's brand
guidelines require the badge unaltered, with its clear space kept and a minimum height
respected — so it is not recoloured, restretched or rebuilt here.

    google-play.png    Get it on Google Play

Using it means accepting Google's terms:
<https://play.google.com/intl/en_us/badges/>

## Another locale

    pnpm fetch-store-badges fr-fr

Then add a line per file to the `google` group in
[`config/image-library.ts`](../../../../config/image-library.ts):

```ts
storeBadge("google", "google-play.png", "Get it on Google Play", "android play store"),
```

Leave `recolorable` off — that is what stops the ink swatch from tinting a trademark.

Note the badge is a PNG. The rasteriser never enlarges a bitmap, so it is used at its
own 646×250 and no larger; if you need it sharper on a 3× export, source a bigger file
from Google's badge tool.
