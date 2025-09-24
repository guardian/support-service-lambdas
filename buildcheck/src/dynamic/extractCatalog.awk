/^[[:space:]]*catalog:/ {
    found = 1
    next
}
found {
    # Always keep comment lines, regardless of indentation or blankness
    if ($0 ~ /^[[:space:]]*#/) {
        sub(/^[[:space:]]+/, "", $0)
        print
        next
    }
    # If line is not indented and not blank, exit
    if ($0 !~ /^[[:space:]]+/ && length($0) > 0) {
        exit
    }
    # Trim leading and trailing whitespace
    sub(/^[[:space:]]+/, "", $0)
    sub(/[[:space:]]+$/, "", $0)
    print
}