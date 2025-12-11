#!/bin/bash

# Build script for production
# Usage:
#   npm run build          - Minify only
#   npm run build:secure   - Minify + Obfuscate

set -e

OBFUSCATE=false
if [ "$1" = "--obfuscate" ]; then
  OBFUSCATE=true
fi

echo "🔨 Building for production..."
[ "$OBFUSCATE" = true ] && echo "🔐 Obfuscation enabled"

# Create dist folder
rm -rf dist
mkdir -p dist

# Minify/Obfuscate JS
echo "📦 Processing JS..."
if [ "$OBFUSCATE" = true ]; then
  npx javascript-obfuscator app.js \
    --output dist/app.min.js \
    --compact true \
    --control-flow-flattening true \
    --control-flow-flattening-threshold 0.5 \
    --dead-code-injection true \
    --dead-code-injection-threshold 0.2 \
    --identifier-names-generator hexadecimal \
    --rename-globals true \
    --rename-properties false \
    --self-defending false \
    --string-array true \
    --string-array-encoding base64 \
    --string-array-threshold 0.5 \
    --split-strings true \
    --split-strings-chunk-length 5 \
    --transform-object-keys true \
    --unicode-escape-sequence false
else
  npx terser app.js \
    --compress passes=3,drop_console=true,pure_funcs=['console.log'] \
    --mangle toplevel,reserved=['calculate','toggleRegionNote'] \
    --output dist/app.min.js
fi

# Minify CSS
echo "🎨 Minifying CSS..."
npx clean-css-cli -o dist/style.min.css style.css

# Copy and update HTML
echo "📄 Processing HTML..."
sed 's/app\.js/app.min.js/g; s/style\.css/style.min.css/g' index.html > dist/index.html

# Minify HTML
npx html-minifier-terser \
  --collapse-whitespace \
  --remove-comments \
  --minify-css true \
  --minify-js true \
  -o dist/index.html \
  dist/index.html

# Copy PWA files
echo "📱 Copying PWA files..."
cp manifest.json dist/
npx terser sw.js --compress --mangle -o dist/sw.js

# Show sizes
echo ""
echo "✅ Build complete!"
echo ""
echo "📊 File sizes:"
echo "   JS:   $(wc -c < app.js | tr -d ' ') → $(wc -c < dist/app.min.js | tr -d ' ') bytes"
echo "   CSS:  $(wc -c < style.css | tr -d ' ') → $(wc -c < dist/style.min.css | tr -d ' ') bytes"
echo "   HTML: $(wc -c < index.html | tr -d ' ') → $(wc -c < dist/index.html | tr -d ' ') bytes"
echo ""
echo "📁 Output: ./dist/"
