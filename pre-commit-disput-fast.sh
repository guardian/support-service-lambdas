#!/bin/bash

set -e

#echo "🔧 Running stripe-disputes modules checks..."
#cd modules
#pnpm fix-formatting
#pnpm test
#cd ..

echo "🔧 Running stripe-disputes handler checks..."
cd handlers/stripe-disputes
pnpm fix-formatting
pnpm lint --fix
pnpm lint
pnpm build
cd target && zip -qr stripe-disputes.zip ./*.js


cd ../../..

PROJECT_NAME="stripe-disputes"
echo "Updating lambda $PROJECT_NAME"
s3Bucket=`aws ssm get-parameter --name /account/services/artifact.bucket --query "Parameter.Value" --output text --profile membership --region eu-west-1`
s3Path="support/CODE/$PROJECT_NAME/$PROJECT_NAME.zip"
zipFile="./handlers/$PROJECT_NAME/target/$PROJECT_NAME.zip"

aws s3 cp $zipFile s3://$s3Bucket/$s3Path --profile membership --region eu-west-1
aws lambda update-function-code \
  --function-name $PROJECT_NAME-CODE \
  --s3-bucket $s3Bucket \
  --s3-key $s3Path \
  --profile membership \
  --region eu-west-1 \
  > /dev/null

echo "Update complete"
rm -rf ./handlers/stripe-disputes/target/index.js
rm -rf ./handlers/stripe-disputes/target/stripe-disputes.zip

#echo "🚀 Updating lambda..."
#./update-lambda.sh stripe-disputes

# sleep 5 seconds to allow the lambda to update
echo "⏳ Waiting 5 seconds for the lambda to update..."
sleep 5

echo "🔍 Testing API endpoint..."
response=$(curl --silent --write-out "HTTPSTATUS:%{http_code}" \
  --request POST \
  --url https://stripe-disputes-code.support.guardianapis.com/listen-dispute-created \
  --header 'Content-Type: application/json' \
  --header 'User-Agent: insomnia/11.4.0' \
  --header 'x-api-key: MBkC7aIGmw8YsXQDs1TRi8iJ2AQDnM8f5aRSy174' \
  --data '{
  "id": "evt_0RystWItVxyc3Q6ncAbcGb9t",
  "object": "event",
  "api_version": "2019-08-14",
  "created": 1755861149,
  "data": {
    "object": {
      "id": "du_0RystVItVxyc3Q6n8IfZyZXt",
      "object": "dispute",
      "amount": 500,
      "balance_transaction": "txn_0RystVItVxyc3Q6nDwOJhj6Z",
      "balance_transactions": [
        {
          "id": "txn_0RystVItVxyc3Q6nDwOJhj6Z",
          "object": "balance_transaction",
          "amount": -500,
          "currency": "gbp",
          "net": -2000,
          "fee": 1500,
          "fee_details": [
            {
              "amount": 1500,
              "currency": "gbp",
              "type": "stripe_fee",
              "description": "Dispute fee",
              "application": null
            }
          ],
          "created": 1755861149,
          "available_on": 1756339200,
          "status": "pending",
          "reporting_category": "dispute",
          "balance_type": "payments",
          "exchange_rate": null,
          "type": "adjustment",
          "source": "du_0RystVItVxyc3Q6n8IfZyZXt",
          "description": "Chargeback withdrawal for ch_2RystUItVxyc3Q6n07hnQyX7"
        }
      ],
      "charge": "ch_2RystUItVxyc3Q6n07hnQyX7",
      "created": 1755861149,
      "currency": "gbp",
      "enhanced_eligibility_types": [],
      "evidence": {
        "access_activity_log": null,
        "billing_address": null,
        "cancellation_policy": null,
        "cancellation_policy_disclosure": null,
        "cancellation_rebuttal": null,
        "customer_communication": null,
        "customer_email_address": null,
        "customer_name": null,
        "customer_purchase_ip": null,
        "customer_signature": null,
        "duplicate_charge_documentation": null,
        "duplicate_charge_explanation": null,
        "duplicate_charge_id": null,
        "enhanced_evidence": {},
        "product_description": null,
        "receipt": null,
        "refund_policy": null,
        "refund_policy_disclosure": null,
        "refund_refusal_explanation": null,
        "service_date": null,
        "service_documentation": null,
        "shipping_address": null,
        "shipping_carrier": null,
        "shipping_date": null,
        "shipping_documentation": null,
        "shipping_tracking_number": null,
        "uncategorized_file": null,
        "uncategorized_text": null
      },
      "evidence_details": {
        "due_by": 1756598399,
        "has_evidence": false,
        "past_due": false,
        "submission_count": 0
      },
      "is_charge_refundable": false,
      "livemode": false,
      "metadata": {},
      "payment_intent": "pi_2RystUItVxyc3Q6n0qqOvNKK",
      "payment_method_details": {
        "type": "card",
        "card": {
          "brand": "visa",
          "network_reason_code": "C030"
        }
      },
      "reason": "noncompliant",
      "status": "needs_response"
    }
  },
  "livemode": false,
  "pending_webhooks": 2,
  "request": {
    "id": "req_6dJ5nbBCTB3Bt2",
    "idempotency_key": "2d5fea1a0aaf46279f75bc752341a6e8_withl3"
  },
  "type": "charge.dispute.created"
}')

http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
body=$(echo $response | sed -e 's/HTTPSTATUS:[0-9]*$//')

echo "API Response: HTTP $http_code"
if [ "$body" != "" ]; then
  echo "Response Body: $body"
fi

if [ "$http_code" = "200" ]; then
  echo "✅ All checks completed successfully! Lambda is working correctly."
else
  echo "❌ API test failed with HTTP $http_code"
  exit 1
fi


# sleep 5 seconds to allow the lambda to update
echo "⏳ Waiting 2 seconds for the lambda to update..."
sleep 2

echo "🔍 Testing API endpoint..."
response=$(curl --silent --write-out "HTTPSTATUS:%{http_code}" \
  --request POST \
  --url https://stripe-disputes-code.support.guardianapis.com/listen-dispute-closed \
  --header 'Content-Type: application/json' \
  --header 'User-Agent: insomnia/11.4.0' \
  --header 'x-api-key: MBkC7aIGmw8YsXQDs1TRi8iJ2AQDnM8f5aRSy174' \
  --data '{
  "id": "evt_0RystWItVxyc3Q6ncAbcGb9t",
  "object": "event",
  "api_version": "2019-08-14",
  "created": 1755861149,
  "data": {
    "object": {
      "id": "du_0RystVItVxyc3Q6n8IfZyZXt",
      "object": "dispute",
      "amount": 500,
      "balance_transaction": "txn_0RystVItVxyc3Q6nDwOJhj6Z",
      "balance_transactions": [
        {
          "id": "txn_0RystVItVxyc3Q6nDwOJhj6Z",
          "object": "balance_transaction",
          "amount": -500,
          "currency": "gbp",
          "net": -2000,
          "fee": 1500,
          "fee_details": [
            {
              "amount": 1500,
              "currency": "gbp",
              "type": "stripe_fee",
              "description": "Dispute fee",
              "application": null
            }
          ],
          "created": 1755861149,
          "available_on": 1756339200,
          "status": "pending",
          "reporting_category": "dispute",
          "balance_type": "payments",
          "exchange_rate": null,
          "type": "adjustment",
          "source": "du_0RystVItVxyc3Q6n8IfZyZXt",
          "description": "Chargeback withdrawal for ch_2RystUItVxyc3Q6n07hnQyX7"
        }
      ],
      "charge": "ch_2RystUItVxyc3Q6n07hnQyX7",
      "created": 1755861149,
      "currency": "gbp",
      "enhanced_eligibility_types": [],
      "evidence": {
        "access_activity_log": null,
        "billing_address": null,
        "cancellation_policy": null,
        "cancellation_policy_disclosure": null,
        "cancellation_rebuttal": null,
        "customer_communication": null,
        "customer_email_address": null,
        "customer_name": null,
        "customer_purchase_ip": null,
        "customer_signature": null,
        "duplicate_charge_documentation": null,
        "duplicate_charge_explanation": null,
        "duplicate_charge_id": null,
        "enhanced_evidence": {},
        "product_description": null,
        "receipt": null,
        "refund_policy": null,
        "refund_policy_disclosure": null,
        "refund_refusal_explanation": null,
        "service_date": null,
        "service_documentation": null,
        "shipping_address": null,
        "shipping_carrier": null,
        "shipping_date": null,
        "shipping_documentation": null,
        "shipping_tracking_number": null,
        "uncategorized_file": null,
        "uncategorized_text": null
      },
      "evidence_details": {
        "due_by": 1756598399,
        "has_evidence": false,
        "past_due": false,
        "submission_count": 0
      },
      "is_charge_refundable": false,
      "livemode": false,
      "metadata": {},
      "payment_intent": "pi_2RystUItVxyc3Q6n0qqOvNKK",
      "payment_method_details": {
        "type": "card",
        "card": {
          "brand": "visa",
          "network_reason_code": "C030"
        }
      },
      "reason": "noncompliant",
      "status": "needs_response"
    }
  },
  "livemode": false,
  "pending_webhooks": 2,
  "request": {
    "id": "req_6dJ5nbBCTB3Bt2",
    "idempotency_key": "2d5fea1a0aaf46279f75bc752341a6e8_withl3"
  },
  "type": "charge.dispute.closed"
}')

http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
body=$(echo $response | sed -e 's/HTTPSTATUS:[0-9]*$//')

echo "API Response: HTTP $http_code"
if [ "$body" != "" ]; then
  echo "Response Body: $body"
fi

if [ "$http_code" = "200" ]; then
  echo "✅ All checks completed successfully! Lambda is working correctly."
else
  echo "❌ API test failed with HTTP $http_code"
  exit 1
fi