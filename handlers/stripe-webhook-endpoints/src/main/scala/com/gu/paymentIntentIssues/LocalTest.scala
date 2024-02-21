package com.gu.paymentIntentIssues

import com.amazonaws.services.lambda.runtime.events.SQSEvent
import com.stripe.net.Webhook
import play.api.libs.json._
import com.fasterxml.jackson.databind.ObjectMapper
import scala.jdk.CollectionConverters._

object LocalTest {

  /** NB: It will probably be quite tricky to run this locally going forward. It was useful during development and is
    * mainly being kept for reference.
    *
    * For testing locally against zuora sandbox we require the following environment variables:
    *
    *   - endpointSecret
    *   - zuoraClientId
    *   - zuoraSecret
    *
    * endpointSecret can be found in the stripe webhook dashboard (https://dashboard.stripe.com/test/webhooks).
    * zuoraClientId and zuoraSecret can be found in parameter store (e.g
    * /CODE/membership/payment-intent-issues/zuoraClientId)
    *
    * To run every step of the zuora update, we need to generate a new failed payment event from stripe. To do this in
    * CODE, we need to:
    *
    *   1. Disable the webhook in AWS to prevent it from processing the event 2. Visit the CODE LP and make a
    *      contribution with a test IBAN (https://stripe.com/docs/connect/testing) 3. Visit the stripe webhook dashboard
    *      to copy the event it generated for the failed payment 4. Paste the event json in the `getJson` function
    *      (maintaining the custom timestamp)
    *
    * NB: this does not test the Stripe signature verification logic. This needs to be done in aws with a real Stripe
    * event.
    */
  def main(args: Array[String]): Unit = {
    println(s"Processing test SEPA payment failure event...")
    val timestamp = getTimestamp
    val json = getJson(timestamp)
    val config = getConfig.get
    val sqsEvent= getSQSEvent()
    val sqsMessages= getSQSMessages(sqsEvent)

    val eventResult = Lambda.deserializeAPIGatewayEvent(sqsEvent)
    println(s"Event Result: $eventResult")


    val result = Lambda.processEvent(json, config)
    println(s"Result: $result")
  }

  def getConfig =
    for {
      endpointSecret <- sys.env.get("endpointSecret")
      zuoraBaseUrl = "https://rest.apisandbox.zuora.com/v1"
      zuoraClientId <- sys.env.get("zuoraClientId")
      zuoraSecret <- sys.env.get("zuoraSecret")
    } yield Config(endpointSecret, zuoraBaseUrl, zuoraClientId, zuoraSecret)

  def getTimestamp = System.currentTimeMillis() / 1000L

  def getJson(timestamp: Long) =
    s"""
{
  "id": "evt_2JPS0AItVxyc3Q6n1kS8z3uw",
  "object": "event",
  "api_version": "2019-08-14",
  "created": ${timestamp},
  "data": {
    "object": {
      "id": "pi_2JPS0AItVxyc3Q6n1Eai3ExG",
      "object": "payment_intent",
      "amount": 500,
      "amount_capturable": 0,
      "amount_received": 0,
      "application": "ca_InA7dYYPZTUPuEBolrjvtCzbkivYpfeM",
      "application_fee_amount": null,
      "canceled_at": null,
      "cancellation_reason": null,
      "capture_method": "automatic",
      "charges": {
        "object": "list",
        "data": [
          {
            "id": "py_2JPS0AItVxyc3Q6n1O3eyhB5",
            "object": "charge",
            "amount": 500,
            "amount_captured": 500,
            "amount_refunded": 0,
            "application": "ca_InA7dYYPZTUPuEBolrjvtCzbkivYpfeM",
            "application_fee": null,
            "application_fee_amount": null,
            "balance_transaction": null,
            "billing_details": {
              "address": {
                "city": null,
                "country": null,
                "line1": null,
                "line2": null,
                "postal_code": null,
                "state": null
              },
              "email": "mr.test@guardian.co.uk",
              "name": "mr test",
              "phone": null
            },
            "calculated_statement_descriptor": null,
            "captured": true,
            "created": 1629205606,
            "currency": "eur",
            "customer": "cus_K3Z8s1gjto6COh",
            "description": null,
            "destination": null,
            "dispute": null,
            "disputed": false,
            "failure_code": null,
            "failure_message": null,
            "fraud_details": {
            },
            "invoice": null,
            "livemode": false,
            "metadata": {
              "zpayment_number": "P-00126890"
            },
            "on_behalf_of": null,
            "order": null,
            "outcome": {
              "network_status": "approved_by_network",
              "reason": null,
              "risk_level": "not_assessed",
              "seller_message": "Payment complete.",
              "type": "authorized"
            },
            "paid": false,
            "payment_intent": "pi_2JPS0AItVxyc3Q6n1Eai3ExG",
            "payment_method": "pm_0JPS09ItVxyc3Q6n4YxpwZAp",
            "payment_method_details": {
              "sepa_debit": {
                "bank_code": "19043",
                "branch_code": null,
                "country": "AT",
                "fingerprint": "vUIITsFzpDpkeigs",
                "last4": "3202",
                "mandate": "mandate_0JPS09ItVxyc3Q6nbjCRwVCD"
              },
              "type": "sepa_debit"
            },
            "receipt_email": null,
            "receipt_number": null,
            "receipt_url": null,
            "refunded": false,
            "refunds": {
              "object": "list",
              "data": [
              ],
              "has_more": false,
              "total_count": 0,
              "url": "/v1/charges/py_2JPS0AItVxyc3Q6n1O3eyhB5/refunds"
            },
            "review": null,
            "shipping": null,
            "source": null,
            "source_transfer": null,
            "statement_descriptor": null,
            "statement_descriptor_suffix": null,
            "status": "failed",
            "transfer_data": null,
            "transfer_group": null
          }
        ],
        "has_more": false,
        "total_count": 1,
        "url": "/v1/charges?payment_intent=pi_2JPS0AItVxyc3Q6n1Eai3ExG"
      },
      "client_secret": "pi_2JPS0AItVxyc3Q6n1Eai3ExG_secret_APuLtVwJ5tvymrq7jbBQY6VEv",
      "confirmation_method": "automatic",
      "created": 1629205606,
      "currency": "eur",
      "customer": "cus_K3Z8s1gjto6COh",
      "description": null,
      "invoice": null,
      "last_payment_error": {
        "code": "payment_intent_payment_attempt_failed",
        "doc_url": "https://stripe.com/docs/error-codes/payment-intent-payment-attempt-failed",
        "message": "The payment failed.",
        "payment_method": {
          "id": "pm_0JPS09ItVxyc3Q6n4YxpwZAp",
          "object": "payment_method",
          "billing_details": {
            "address": {
              "city": null,
              "country": null,
              "line1": null,
              "line2": null,
              "postal_code": null,
              "state": null
            },
            "email": "mr.test@guardian.co.uk",
            "name": "mr test",
            "phone": null
          },
          "created": 1629205605,
          "customer": "cus_K3Z8s1gjto6COh",
          "livemode": false,
          "metadata": {
          },
          "sepa_debit": {
            "bank_code": "19043",
            "branch_code": "",
            "country": "AT",
            "fingerprint": "vUIITsFzpDpkeigs",
            "generated_from": {
              "charge": null,
              "setup_attempt": null
            },
            "last4": "3202"
          },
          "type": "sepa_debit"
        },
        "type": "invalid_request_error"
      },
      "level3": null,
      "livemode": false,
      "metadata": {
        "zpayment_number": "P-00126890"
      },
      "next_action": null,
      "on_behalf_of": null,
      "payment_method": null,
      "payment_method_options": {
        "sepa_debit": {
        }
      },
      "payment_method_types": [
        "sepa_debit"
      ],
      "receipt_email": null,
      "review": null,
      "setup_future_usage": null,
      "shipping": null,
      "source": null,
      "statement_descriptor": null,
      "statement_descriptor_suffix": null,
      "status": "requires_payment_method",
      "transfer_data": null,
      "transfer_group": null
    }
  },
  "livemode": false,
  "pending_webhooks": 1,
  "request": {
    "id": null,
    "idempotency_key": null
  },
  "type": "payment_intent.payment_failed"
}
  """

  def getHeaders(endpointSecret: String, json: String, timestamp: Long) = {
    val signature = Webhook.Util.computeHmacSha256(endpointSecret, json)
    Map("Stripe-Signature" -> s"t=$timestamp,v1=$signature").asJava
  }

  def getSQSEvent()= s"""
   {
     "Records": [
         {
             "messageId": "059f36b4-87a3-44ab-83d2-661975830a7d",
             "receiptHandle": "AQEBwJnKyrHigUMZj6rYigCgxlaS3SLy0a...",
             "body": ${json1}),
             "attributes": {
                 "ApproximateReceiveCount": "1",
                 "SentTimestamp": "1545082649183",
                 "SenderId": "AIDAIENQZJOLO23YVJ4VO",
                 "ApproximateFirstReceiveTimestamp": "1545082649185"
             },
             "messageAttributes": {},
             "md5OfBody": "e4e68fb7bd0e697a0ae8f1bb342846b3",
             "eventSource": "aws:sqs",
             "eventSourceARN": "arn:aws:sqs:us-east-2:123456789012:my-queue",
             "awsRegion": "us-east-2"
         },
         {
             "messageId": "2e1424d4-f796-459a-8184-9c92662be6da",
             "receiptHandle": "AQEBzWwaftRI0KuVm4tP+/7q1rGgNqicHq...",
             "body": "Test message.",
             "attributes": {
                 "ApproximateReceiveCount": "1",
                 "SentTimestamp": "1545082650636",
                 "SenderId": "AIDAIENQZJOLO23YVJ4VO",
                 "ApproximateFirstReceiveTimestamp": "1545082650649"
             },
             "messageAttributes": {},
             "md5OfBody": "e4e68fb7bd0e697a0ae8f1bb342846b3",
             "eventSource": "aws:sqs",
             "eventSourceARN": "arn:aws:sqs:us-east-2:123456789012:my-queue",
             "awsRegion": "us-east-2"
         }
     ]
 }	"""

  def getSQSMessages(jsonString: String): Seq[String]  = {
    // Parse the JSON string
    val json = Json.parse(jsonString)
    // Extract the "Records" field
    val records = (json \ "Records").asOpt[JsArray]

    records match {
      case Some(jsArray) => jsArray.value.map { message =>
        (message \ "body").as[String]
      } .toSeq// Extracts the list of messages
      case None => Seq.empty[String] // Returns an empty list if "Records" field is not found
    }

  }

  val json1 =
    """
  {
    "resource": "/{proxy+}",
    "path": "/hello/world",
    "httpMethod": "POST",
    "headers": {
      "Accept": "*/*",
      "Content-Type": "application/json"
    },
    "requestContext": {
      "identity": {
        "apiKey": "test-api-key"
      }
    },
    "body": "{\"name\":\"John\",\"age\":30}",
    "isBase64Encoded": false
  }
  """


}
