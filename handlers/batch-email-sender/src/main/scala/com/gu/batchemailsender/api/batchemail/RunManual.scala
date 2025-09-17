package com.gu.batchemailsender.api.batchemail

import com.gu.util.apigateway.ApiGatewayRequest

// run this to send an email in CODE/test env
// change the email and ids to your own
object RunManual {

  def main(args: Array[String]): Unit = {
    val email = "test.user@guardian.co.uk"
    val sfcontactId = "123473658AAA"
    val identityId = "12345"
    val body = s"""{"batch_items":[{"payload":{"to_address":"$email","subscriber_id":"A-1234","sf_contact_id":"$sfcontactId","record_id":"123rec","product":"Newspaper - National Delivery","next_charge_date":"2025-09-25","modified_by_customer":true,"last_name":"Batchemailsender","identity_id":"$identityId","holiday_stop_request":{"stopped_issue_count":"14","stopped_credit_summaries":[{"credit_date":"2025-10-25","credit_amount":43.86}],"stopped_credit_sum":"43.86","holiday_start_date":"2025-09-26","holiday_end_date":"2025-10-11","currency_symbol":"&pound;","bulk_suspension_reason":null},"first_name":"SupportServiceLambdas","email_stage":"create","digital_voucher":null,"delivery_address_change":null},"object_name":"Holiday_Stop_Request__c"}]}"""
    val apiGatewayRequest = ApiGatewayRequest(
      Some("POST"),
      Some(Map("oldApi" -> "true")),
      Some(body),
      Some(Map("content-type" -> "application/json")),
      None, Some("/email-batch")
    )
    Handler.handle(apiGatewayRequest)
  }

}
