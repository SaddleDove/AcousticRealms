#!/bin/bash
set -Eeuo pipefail

echo "Running validate..."
pnpm validate
echo "Validate passed!"
