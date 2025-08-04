#!/bin/bash

# Define array of TypeScript handler directories
typescript_handlers=(
    "user-benefits"
    "press-reader-entitlements"
    "ticket-tailor-webhook"
    "update-supporter-plus-amount"
    "product-switch-api"
    "generate-product-catalog"
    "alarms-handler"
    "discount-api"
    "discount-expiry-notifier"
    "salesforce-disaster-recovery"
    "salesforce-disaster-recovery-health-check"
    "salesforce-event-bus"
    "zuora-salesforce-link-remover"
    "metric-push-api"
    "observer-data-export"
    "negative-invoices-processor"
    "write-off-unpaid-invoices"
    "mparticle-api"
)

# Navigate to the handlers directory
cd handlers

# Function to process a single handler
process_handler() {
    local handler=$1
    if [ -d "$handler" ]; then
        echo "Processing TypeScript handler: $handler"
        cd "$handler"
        
        # Check if package.json exists and contains TypeScript
        if [ -f "package.json" ] && grep -q "typescript\|@types" package.json; then
            echo "Running pnpm package in $handler"
            pnpm package
            echo "Completed: $handler"
        else
            echo "No TypeScript project found in $handler, skipping..."
        fi
        
        cd ..
    else
        echo "Handler directory $handler not found, skipping..."
    fi
}

# Export the function so it can be used by subshells
export -f process_handler

# Process handlers in parallel
echo "Starting parallel processing of ${#typescript_handlers[@]} handlers..."

for handler in "${typescript_handlers[@]}"; do
    process_handler "$handler" &
done

# Wait for all background processes to complete
wait

# Return to project root
cd ..

echo "Finished processing all TypeScript handlers"