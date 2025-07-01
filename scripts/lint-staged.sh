#!/bin/bash

# Get staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

# Filter to lintable files
LINTABLE_FILES=$(echo "$STAGED_FILES" | grep -E '\.(js|jsx|ts|tsx|vue|svelte)$' || true)

if [ -n "$LINTABLE_FILES" ]; then
    echo "Linting staged files:"
    echo "$LINTABLE_FILES" | sed 's/^/  /'

    # Run your linter on the staged files
    # Adjust this based on your specific setup
    npm run lint -- $LINTABLE_FILES
else
    echo "No staged lintable files found"
fi
