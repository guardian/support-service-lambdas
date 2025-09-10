#!/bin/bash -e

script_name=$(basename "$0")

if [ $# -lt 2 ]; then
    echo "Error: Repository root path and handler name must be provided" >&2
    echo "Usage: $script_name <repo_root> <handler_name>" >&2
    exit 1
fi

repo_root="$1"
handler_name="$2"

if [[ ! -d "$repo_root" ]] || [[ ! "$repo_root" =~ ^/ ]] || [[ ! "$repo_root" =~ support-service-lambdas$ ]]; then
    echo "Error: Invalid repository root: $repo_root" >&2
    exit 1
fi

handler_path="$repo_root/handlers/$handler_name"

if [[ ! -d "$handler_path" ]]; then
    echo "Error: Handler directory does not exist: handlers/$handler_name" >&2
    exit 1
fi

lambda_path="$handler_path/lambda"
cdk_path="$handler_path/cdk"

if [[ -d "$lambda_path" ]] || [[ -d "$cdk_path" ]]; then
    echo "Error: handlers/$handler_name already appears to have the migrated structure" >&2
    exit 1
fi

echo "$script_name: START migrating handler $handler_name..."

cdk_lib_path="$cdk_path/lib"
cdk_bin_path="$cdk_path/bin"

root_cdk_lib_path="$repo_root/cdk/lib"

mkdir -p "$lambda_path"

# Move files to lambda directory (except README.md and riff-raff.yaml)
ls -1 "$handler_path" | grep -v -E "^(README\.md|riff-raff\.yaml|lambda|cdk)$" | while read -r filename; do
    echo "Moving $filename to lambda/"
    mv "$handler_path/$filename" "$lambda_path/"
done

echo "/cdk.out" > "$cdk_path/.gitignore"

mkdir -p "$cdk_lib_path"
mkdir -p "$cdk_lib_path/__snapshots__"

cdk_files=("$handler_name.ts" "$handler_name.test.ts" "__snapshots__/$handler_name.test.ts.snap")

for file in "${cdk_files[@]}"; do
    source_path="$root_cdk_lib_path/$file"
    target_path="$cdk_lib_path/$file"

    if [[ -f "$source_path" ]]; then
        echo "Moving cdk file: $source_path to $target_path"
        mv "$source_path" "$target_path"
    else
      echo "WARNING: $source_path did not exist, please check and move manually"
    fi
done

mkdir -p "$cdk_bin_path"

cat > "$cdk_bin_path/cdk.ts" << 'EOF'
// placeholder content
throw new Error("Please move the relevant section from $repo_root/cdk/bin/cdk.ts");
EOF

echo "$script_name: FINISH Handler structure has been migrated for $handler_name."
