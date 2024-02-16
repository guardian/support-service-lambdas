cat ./modules/catalog/test/fixtures/catalog-prod.json | \
jq --arg product "Contributor" '.products[] | select(.name == $product)' | \
jq '{name: .name, prp: [.productRatePlans[] | {name: .name, chg: .productRatePlanCharges[] | {name: .name, id: .id}}]}'