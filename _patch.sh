#!/usr/bin/env bash
set -euo pipefail
ver=v20260215d
cd "$(dirname "$0")"

# update css
sed -i "s#assets/css/style\.css[^\"']*#assets/css/style.$ver.css#g" index.html
for f in search/index.html document/index.html about-site/index.html about-studio/index.html cda-project/index.html maintenance/index.html policy/privacy/index.html policy/security/index.html policy/usage/index.html; do
  [ -f "$f" ] || continue
  sed -i "s#\.\./assets/css/style\.css[^\"']*#../assets/css/style.$ver.css#g" "$f"
  sed -i "s#assets/css/style\.css[^\"']*#assets/css/style.$ver.css#g" "$f"
done

# maintenance-guard
sed -i "s#assets/js/maintenance-guard\.js#assets/js/maintenance-guard.$ver.js#g" index.html
for f in search/index.html document/index.html about-site/index.html about-studio/index.html cda-project/index.html maintenance/index.html policy/privacy/index.html policy/security/index.html policy/usage/index.html; do
  [ -f "$f" ] || continue
  sed -i "s#\.\./assets/js/maintenance-guard\.js#../assets/js/maintenance-guard.$ver.js#g" "$f"
done

# entry scripts
sed -i "s#assets/js/index\.js#assets/js/index.$ver.js#g" index.html
sed -i "s#\.\./assets/js/search\.js#../assets/js/search.$ver.js#g" search/index.html
sed -i "s#\.\./assets/js/cda-project\.js#../assets/js/cda-project.$ver.js#g" cda-project/index.html
sed -i "s#\.\./assets/js/post\.js#../assets/js/post.$ver.js#g" document/index.html
sed -i "s#\.\./assets/js/about\.js#../assets/js/about.$ver.js#g" about-site/index.html about-studio/index.html

