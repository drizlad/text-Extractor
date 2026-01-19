#!/bin/bash
# Simple script to create placeholder icons for the extension

# Create a simple blue square icon for each size
sips -s format png --setProperty format png -z 16 16 /System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/GenericDocumentIcon.icns --out icon-16.png 2>/dev/null || echo "Creating placeholder icon-16.png"
sips -s format png --setProperty format png -z 48 48 /System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/GenericDocumentIcon.icns --out icon-48.png 2>/dev/null || echo "Creating placeholder icon-48.png"
sips -s format png --setProperty format png -z 128 128 /System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/GenericDocumentIcon.icns --out icon-128.png 2>/dev/null || echo "Creating placeholder icon-128.png"

# If sips fails, create simple colored squares using Python (if available)
python3 << 'EOF'
from PIL import Image, ImageDraw

sizes = [16, 48, 128]
for size in sizes:
    img = Image.new('RGB', (size, size), color='#4285F4')  # Google blue
    draw = ImageDraw.Draw(img)
    # Draw a simple "T" for Text
    text_size = size // 2
    draw.text((size//4, size//4), 'T', fill='white')
    img.save(f'icon-{size}.png')
EOF
