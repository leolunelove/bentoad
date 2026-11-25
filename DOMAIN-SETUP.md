# bentoad domain move

Primary repository: https://github.com/leolunelove/bentoad, Pages from main:/, CNAME bentoad.leolune.fun.

Legacy repository: https://github.com/leolunelove/squared, Pages from main:/docs, CNAME squared.leolune.fun. Keep this domain available; do not replace its CNAME or remove its saved-progress bridge.

Namecheap needs a CNAME host bentoad → leolunelove.github.io with Automatic TTL. Preserve the existing squared record and all unrelated DNS records. The new custom domain has been saved in GitHub Pages; DNS authentication is pending. Enable Enforce HTTPS after the certificate is issued.

First publish save-bridge.html and classic.html on the legacy site without changing its index. Publish the new game to the new repo. Verify DNS, HTTPS and a real same-browser save import on the new address. Only then replace the old index with legacy/index.html. The redirect carries no save in its URL. New-address bootstrap requests the original save from the old same-site origin, validates its origin/source/nonce and merges it locally.

The original squared-save-v1 remains at the old origin. Successful migration is marked only after the new address reads back its written save. Import does not delete or modify the source. Already migrated browsers keep new-address progress on reload. A popup retry allows first-party access when an embedded transfer is blocked. Saves remain local to each browser; this is not cross-device cloud sync.
