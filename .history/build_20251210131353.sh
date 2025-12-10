#!/bin/bash

# Build script for production
# Requires: npm install -g terser clean-css-cli html-minifier-terser

set -e

echo "🔨 Building for production..."

# Create dist folder
rm -rf dist
mkdir -p dist

# Minify JS
echo "📦 Minifying JS..."
npx terser app.js -c -m -o dist/app.min.js

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

