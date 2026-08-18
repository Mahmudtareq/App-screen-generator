# Apple badges

These files are **Apple's own artwork**, downloaded from Apple's marketing tools API
by `pnpm fetch-store-badges`. They are not redrawn, and they must not be altered:
Apple licenses the App Store badge to developers on terms that require its unmodified
artwork, so recolouring it, changing its proportions or rebuilding it by hand is a
violation rather than a shortcut.

    app-store-black.svg        Download on the App Store (dark)
    app-store-white.svg        Download on the App Store (light)
    mac-app-store-black.svg    Download on the Mac App Store (dark)
    mac-app-store-white.svg    Download on the Mac App Store (light)

Using them means accepting Apple's terms:
<https://developer.apple.com/app-store/marketing/guidelines/>

Apple also requires the badge to keep its clear space and minimum size. The editor
will happily let you scale a layer below that; that part is on you.

## Another locale, or more badges

    pnpm fetch-store-badges fr-fr

Then add a line per file to the `apple` group in
[`config/image-library.ts`](../../../../config/image-library.ts):

```ts
storeBadge("apple", "app-store-black.svg", "Download on the App Store", "ios iphone"),
```

Leave `recolorable` off — that is what stops the ink swatch from tinting a trademark.
