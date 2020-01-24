curl --location --request POST 'https://rest.zuora.com/v1/batch-query/' \
--header 'Content-Type: application/json' \
--header "Authorization: Bearer $1" \
--data-raw '{
"format" : "csv",
"version" : "1.1",
"name" : "ExportInvoiceItemsTool",
"encrypted" : "none",
"useQueryLabels" : "true",
"dateTimeUtc" : "true",
"queries"  : [ {
    "name" : "ExportInvoiceItemsTool-Negative-Holiday-Stop-Invoices",
    "query" : "SELECT Invoice.InvoiceDate, Invoice.InvoiceNumber, Subscription.Name, avg(Invoice.Amount) AS InvoiceAmount, sum(InvoiceItem.ChargeAmount) AS InvoiceItemTotalAmount FROM InvoiceItem WHERE Invoice.InvoiceDate > '\''2019-06-01'\'' AND Invoice.Amount <= 0 AND RatePlan.Name = '\''DO NOT USE MANUALLY: Holiday Credit - automated'\'' AND RatePlanCharge.Name = '\''Holiday Credit'\'' GROUP BY Invoice.InvoiceDate, Invoice.InvoiceNumber, Subscription.Name",
    "type" : "zoqlexport"
  }]
}'