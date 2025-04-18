#!/bin/bash

# Create icons directory if it doesn't exist
mkdir -p icons

# Function to create an icon with text
create_icon() {
  size=$1
  bg_color=$2
  text=$3
  text_weight=$4
  output=$5
  
  # Calculate text size (approximately 60% of icon size)
  text_size=$(echo "$size * 0.6" | bc)
  text_size=${text_size%.*}  # Remove decimal part
  
  # Calculate vertical position (adjusted for visual centering)
  # For text, we need to position at about 65-70% of the height for visual balance
  vertical_pos=$(echo "$size * 0.68" | bc)
  vertical_pos=${vertical_pos%.*}
  
  # Calculate horizontal position (30% from the left edge)
  horizontal_pos=$(echo "$size * 0.3" | bc)
  horizontal_pos=${horizontal_pos%.*}
  
  # Create a temporary SVG file with left-aligned text
  cat > temp_icon.svg << EOF
<svg xmlns="http://www.w3.org/2000/svg" width="$size" height="$size">
  <rect width="$size" height="$size" fill="$bg_color" />
  <text x="$horizontal_pos" y="$vertical_pos" 
        font-family="Arial, sans-serif" 
        font-size="$text_size" 
        font-weight="$text_weight" 
        text-anchor="middle" 
        fill="white">$text</text>
</svg>
EOF
  
  # Convert SVG to PNG using sips
  /usr/bin/sips -s format png temp_icon.svg --out "$output"
  
  # Remove temporary SVG
  rm temp_icon.svg
  
  echo "Created $output"
}

# Create icons of different sizes
for size in 16 48 128; do
  # Active icon (green with bold uppercase B)
  create_icon $size "#27ae60" "B" "bold" "icons/active-icon-$size.png"
  
  # Inactive icon (blue with lowercase b)
  create_icon $size "#3498db" "b" "normal" "icons/inactive-icon-$size.png"
done

echo "All icons created successfully!" 