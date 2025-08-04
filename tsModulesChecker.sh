#!/bin/bash

# Define array of TypeScript module directories
typescript_modules=(
    # "aws"
    # "bigquery"
    # "email"
    # "identity"
    # "internationalisation"
    # "product-benefits"
    # "product-catalog"
    # "routing"
    # "salesforce"
    # "secrets-manager"
    # "supporter-product-data"
    # "sync-supporter-product-data"
    # "test-users"
    # "validation"
    "zuora"
    # "zuora-catalog"
)

# Navigate to the modules directory
cd modules

# Function to process a single module
process_module() {
    local module=$1
    if [ -d "$module" ]; then
        echo "Processing TypeScript module: $module"
        cd "$module"
        
        # Check if package.json exists and contains TypeScript
        # if [ -f "package.json" ] && grep -q "typescript\|@types" package.json; then
            echo "Running pnpm --filter \"./modules/**\" lint in $module"
            pnpm --filter "./modules/**" lint
            echo "Completed: $module"
        # else
        #     echo "No TypeScript project found in $module, skipping..."
        # fi
        
        cd ..
    else
        echo "Module directory $module not found, skipping..."
    fi
}

# Export the function so it can be used by subshells
export -f process_module

# Process modules in parallel
echo "Starting parallel processing of ${#typescript_modules[@]} modules..."

for module in "${typescript_modules[@]}"; do
    process_module "$module" &
done

# Wait for all background processes to complete
wait

# Return to project root
cd ..

echo "Finished processing