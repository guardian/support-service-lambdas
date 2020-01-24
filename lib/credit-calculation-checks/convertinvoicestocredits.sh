#!/bin/bash

while IFS="," read -r invoicedate invoiceno subscriptiono invoiceamount itemamount
do
creditamount=$(echo "0 - $invoiceamount" | bc -l)

echo $creditamount $invoiceno

curl --location --request POST 'https://rest.zuora.com/v1/object/credit-balance-adjustment' \
--header "Authorization: Bearer $2" \
--header 'Content-Type: application/json' \
--data-raw "{
\"Amount\": $creditamount,
\"Comment\": \"Testing converting of negative holiday stop invoice to credit balance\",
\"SourceTransactionNumber\": \"$invoiceno\",
\"Type\": \"Increase\"
}"
done < "$1"