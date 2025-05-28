#!/bin/bash

# Script to fix the corrupted route.ts file
cd /Users/alexhawkins/Sites/live-story-generator

# Backup the corrupted file if it hasn't been backed up already
if [ ! -f "src/app/api/story/create/route-corrupted.ts" ]; then
  cp src/app/api/story/create/route.ts src/app/api/story/create/route-corrupted.ts
fi

# Remove the current route.ts file
rm -f src/app/api/story/create/route.ts

# Copy the fixed version to route.ts
cp src/app/api/story/create/route-fixed.ts src/app/api/story/create/route.ts

echo "Route file has been fixed successfully!"
echo "The corrupted file has been backed up to route-corrupted.ts"