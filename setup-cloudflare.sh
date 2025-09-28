#!/bin/bash

echo "Creating Cloudflare resources for simple analytics with R2 export..."

# Create KV namespace for analytics cache
echo "Creating KV namespace..."
npx wrangler kv namespace create "ANALYTICS_CACHE"

# Create R2 bucket for analytics exports
echo "Creating R2 bucket for exports..."
npx wrangler r2 bucket create analytics-data

echo ""
echo "Resources created! Now update wrangler.jsonc with the KV namespace ID shown above."
echo ""
echo "The R2 bucket 'analytics-data' is already configured in wrangler.jsonc."
echo ""
echo "Example wrangler.jsonc KV update:"
echo '{'
echo '  "kv_namespaces": ['
echo '    {'
echo '      "binding": "ANALYTICS_CACHE",'
echo '      "id": "YOUR_KV_NAMESPACE_ID_HERE"'
echo '    }'
echo '  ]'
echo '}'
echo ""
echo "Features enabled:"
echo "• KV Storage: Ultra-fast execution counter at the edge"
echo "• R2 Storage: Export analytics data to JSON files in cloud storage"