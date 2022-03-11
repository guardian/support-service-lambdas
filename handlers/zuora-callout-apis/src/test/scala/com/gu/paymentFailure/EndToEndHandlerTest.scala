package com.gu.paymentFailure

import java.io.{ByteArrayInputStream, ByteArrayOutputStream}

import com.gu.TestData._
import com.gu.effects.{FakeFetchString, TestingRawEffects}
import com.gu.effects.TestingRawEffects.HTTPResponse
import com.gu.effects.sqs.AwsSQSSend.{Payload, QueueName}
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.config.Stage
import scala.util.{Success, Try}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class EndToEndHandlerTest extends AnyFlatSpec with Matchers {

  case class testData(zuoraCalloutInput: String, expectedEmailSend: String)

  it should "manage an end to end call" in endToEndTest(EndToEndData)

  it should "manage an end to end call with billing details" in endToEndTest(EndToEndDataWithBillingDetails)

  def endToEndTest(endToEndData: EndtoEndBaseData) = {

    val stream = new ByteArrayInputStream(endToEndData.zuoraCalloutJson.getBytes(java.nio.charset.StandardCharsets.UTF_8))
    val os = new ByteArrayOutputStream()
    val config = new TestingRawEffects(200, EndToEndData.responses)
    var capturedPayload: Option[Payload] = None

    def sqsSend(queueName: QueueName)(payload: Payload): Try[Unit] = Success { capturedPayload = Some(payload) }

    //execute
    Lambda.runForLegacyTestsSeeTestingMd(
      Stage("DEV"),
      FakeFetchString.fetchString,
      config.response,
      LambdaIO(stream, os, null),
      sqsSend
    )

    capturedPayload.get.value jsonMatches endToEndData.expectedEmailSend

    val responseString = new String(os.toByteArray(), "UTF-8")

    val expectedResponse = """{
                             |"statusCode":"200",
                             |"headers":{"Content-Type":"application/json"},
                             |"body":"{\n  \"message\" : \"Success\"\n}"
                             |}
                             |""".stripMargin

    responseString jsonMatches expectedResponse
  }
}

trait EndtoEndBaseData {

  def zuoraCalloutJson: String
  def expectedEmailSend: String

  def responses: Map[String, HTTPResponse] = Map(
    ("/transactions/invoices/accounts/2c92c0f85fc90734015fca884c3f04cf", HTTPResponse(200, invoices)),
    ("/v1/requestToken", HTTPResponse(200, """{"accessToken":"", "expiresIn":1}""")),
    ("/messaging/v1/messageDefinitionSends/111/send", HTTPResponse(202, ""))
  )

  val invoices =
    """
      |{
      |    "invoices": [
      |        {
      |            "id": "2c92c0f85fc90734015fca884d2c04e3",
      |            "accountId": "2c92c0f85fc90734015fca884c3f04cf",
      |            "accountNumber": "A00071156",
      |            "accountName": "001g000001mtjX6AAI",
      |            "invoiceDate": "2017-11-17",
      |            "invoiceNumber": "INV00093244",
      |            "dueDate": "2017-11-17",
      |            "invoiceTargetDate": "2017-11-17",
      |            "amount": 49,
      |            "balance": 48.97,
      |            "creditBalanceAdjustmentAmount": 0,
      |            "createdBy": "2c92c0f948f36bdb0148f58d6efb72cd",
      |            "status": "Posted",
      |            "body": "/v1/files/2c92c08c5fc90706015fcb2a48eb2df8",
      |            "invoiceItems": [
      |                {
      |                    "id": "2c92c0f85fc90734015fca884d2f04e5",
      |                    "subscriptionName": "A-S00071536",
      |                    "subscriptionId": "2c92c0f85fc90734015fca884c7d04d3",
      |                    "serviceStartDate": "2017-11-17",
      |                    "serviceEndDate": "2018-11-16",
      |                    "chargeAmount": 40.83,
      |                    "chargeDescription": "",
      |                    "chargeName": "Non Founder Supporter - Annual",
      |                    "chargeId": "2c92c0f85fc90734015fca884ca304d8",
      |                    "productName": "Supporter",
      |                    "quantity": 1,
      |                    "taxAmount": 8.17,
      |                    "unitOfMeasure": "",
      |                    "chargeDate": "2017-11-17 15:10:51",
      |                    "chargeType": "Recurring",
      |                    "processingType": "Charge"
      |                }
      |            ],
      |            "invoiceFiles": [
      |                {
      |                    "id": "2c92c08c5fc90706015fcb2a48ee2dfa",
      |                    "versionNumber": 1510942066777,
      |                    "pdfFileUrl": "/v1/files/2c92c08c5fc90706015fcb2a48eb2df8"
      |                },
      |                {
      |                    "id": "2c92c08b5fc912f3015fcb1f2f7e2d3d",
      |                    "versionNumber": 1510941339362,
      |                    "pdfFileUrl": "/v1/files/2c92c08b5fc912f3015fcb1f2f7b2d3b"
      |                },
      |                {
      |                    "id": "2c92c08a5fc90725015fcb1eb7462d4c",
      |                    "versionNumber": 1510941308548,
      |                    "pdfFileUrl": "/v1/files/2c92c08a5fc90725015fcb1eb7422d4a"
      |                },
      |                {
      |                    "id": "2c92c08c5fc90706015fcb1d93ab2d31",
      |                    "versionNumber": 1510941233946,
      |                    "pdfFileUrl": "/v1/files/2c92c08c5fc90706015fcb1d93a92d2f"
      |                },
      |                {
      |                    "id": "2c92c08c5fc90706015fcb1984112d16",
      |                    "versionNumber": 1510940967815,
      |                    "pdfFileUrl": "/v1/files/2c92c08c5fc90706015fcb19840f2d14"
      |                },
      |                {
      |                    "id": "2c92c08a5fc90727015fcb18f0b42d2e",
      |                    "versionNumber": 1510940930076,
      |                    "pdfFileUrl": "/v1/files/2c92c08a5fc90727015fcb18f0b12d2c"
      |                },
      |                {
      |                    "id": "2c92c08d5fc912df015fca8851aa1a8c",
      |                    "versionNumber": 1510931452200,
      |                    "pdfFileUrl": "/v1/files/2c92c08d5fc912df015fca8851a81a8a"
      |                }
      |            ]
      |        }
      |    ],
      |    "success": true
      |}
    """.stripMargin

}

object EndToEndDataWithBillingDetails extends EndtoEndBaseData {
  override val expectedEmailSend =
    """{
      |  "DataExtensionName": "first-failed-payment-email",
      |  "To": {
      |    "Address": "john.duffell@guardian.co.uk",
      |    "SubscriberKey": "john.duffell@guardian.co.uk",
      |    "ContactAttributes": {
      |      "SubscriberAttributes": {
      |        "subscriber_id": "A-S00071536",
      |        "product": "Supporter",
      |        "payment_method": "CreditCardReferenceTransaction",
      |        "card_type": "Visa",
      |        "card_expiry_date": "12/2019",
      |        "first_name": "eSAFaBwm4WJZNg5xhIc",
      |        "last_name": "eSAFaBwm4WJZNg5xhIc",
      |        "paymentId": "2c92c0f95fc912eb015fcb2a481720e6",
      |        "serviceStartDate": "17 November 2017",
      |        "serviceEndDate": "16 November 2018",
      |        "billing_address1": "billingAddress1Value",
      |        "billing_address2": "billingAddress2Value",
      |        "billing_postcode": "billingPostcodeValue",
      |        "billing_city": "billingCityValue",
      |        "billing_state": "billingStateValue",
      |        "billing_country": "billingCountryValue",
      |        "title": "billingTitleValue"
      |      }
      |    }
      |  },
      |  "SfContactId": "1000000"
      |}""".stripMargin

  override val zuoraCalloutJson =
    """
      |{
      |    "resource": "/payment-failure",
      |    "path": "/payment-failure",
      |    "httpMethod": "POST",
      |    "headers": {
      |        "CloudFront-Forwarded-Proto": "https",
      |        "CloudFront-Is-Desktop-Viewer": "true",
      |        "CloudFront-Is-Mobile-Viewer": "false",
      |        "CloudFront-Is-SmartTV-Viewer": "false",
      |        "CloudFront-Is-Tablet-Viewer": "false",
      |        "CloudFront-Viewer-Country": "US",
      |        "Content-Type": "application/json; charset=utf-8",
      |        "Host": "hosthosthost",
      |        "User-Agent": "Amazon CloudFront",
      |        "Via": "1.1 c154e1d9f76106d9025a8ffb4f4831ae.cloudfront.net (CloudFront), 1.1 11b20299329437ea4e28ea2b556ea990.cloudfront.net (CloudFront)",
      |        "X-Amz-Cf-Id": "hihi",
      |        "X-Amzn-Trace-Id": "Root=1-5a0f2574-4cb4d1534b9f321a3b777624",
      |        "X-Forwarded-For": "1.1.1.1, 1.1.1.1",
      |        "X-Forwarded-Port": "443",
      |        "X-Forwarded-Proto": "https"
      |    },
      |    "queryStringParameters": {
      |        "apiClientId": "a",
      |        "apiToken": "b"
      |    },
      |    "pathParameters": null,
      |    "stageVariables": null,
      |    "requestContext": {
      |        "path": "/CODE/payment-failure",
      |        "accountId": "865473395570",
      |        "resourceId": "ls9b61",
      |        "stage": "CODE",
      |        "requestId": "11111111-cbc2-11e7-a389-b7e6e2ab8316",
      |        "identity": {
      |            "cognitoIdentityPoolId": null,
      |            "accountId": null,
      |            "cognitoIdentityId": null,
      |            "caller": null,
      |            "apiKey": "",
      |            "sourceIp": "1.1.1.1",
      |            "accessKey": null,
      |            "cognitoAuthenticationType": null,
      |            "cognitoAuthenticationProvider": null,
      |            "userArn": null,
      |            "userAgent": "Amazon CloudFront",
      |            "user": null
      |        },
      |        "resourcePath": "/payment-failure",
      |        "httpMethod": "POST",
      |        "apiId": "11111"
      |    },
      |    "body": "{\"accountId\":\"2c92c0f85fc90734015fca884c3f04cf\",\"firstName\":\"eSAFaBwm4WJZNg5xhIc\",\"lastName\":\"eSAFaBwm4WJZNg5xhIc\",\"creditCardExpirationMonth\":\"12\",\"creditCardExpirationYear\":\"2019\",\"paymentId\":\"2c92c0f95fc912eb015fcb2a481720e6\",\"tenantId\":\"c\",\"currency\":\"USD\",\"creditCardType\":\"Visa\",\"paymentMethodType\":\"CreditCardReferenceTransaction\",\"email\":\"john.duffell@guardian.co.uk\",\"failureNumber\":\"1\",\"billToContactAddress2\":\"billingAddress2Value\",\"billToContactCity\":\"billingCityValue\",\"billToContactAddress1\":\"billingAddress1Value\",\"billToContactState\":\"billingStateValue\",\"billToContactCountry\":\"billingCountryValue\",\"billToContactPostalCode\":\"billingPostcodeValue\",\"title\":\"billingTitleValue\", \"sfContactId\": \"1000000\"}",
      |    "isBase64Encoded": false
      |}
    """.stripMargin
}
object EndToEndData extends EndtoEndBaseData {

  override val expectedEmailSend =
    """{
      |  "DataExtensionName": "first-failed-payment-email",
      |  "To": {
      |    "Address": "john.duffell@guardian.co.uk",
      |    "SubscriberKey": "john.duffell@guardian.co.uk",
      |    "ContactAttributes": {
      |      "SubscriberAttributes": {
      |        "subscriber_id": "A-S00071536",
      |        "product": "Supporter",
      |        "payment_method": "CreditCardReferenceTransaction",
      |        "card_type": "Visa",
      |        "card_expiry_date": "12/2019",
      |        "first_name": "eSAFaBwm4WJZNg5xhIc",
      |        "last_name": "eSAFaBwm4WJZNg5xhIc",
      |        "paymentId": "2c92c0f95fc912eb015fcb2a481720e6",
      |        "serviceStartDate": "17 November 2017",
      |        "serviceEndDate": "16 November 2018"
      |      }
      |    }
      |  },
      |  "SfContactId": "1000000"
      |}""".stripMargin

  override val zuoraCalloutJson =
    """
      |{
      |    "resource": "/payment-failure",
      |    "path": "/payment-failure",
      |    "httpMethod": "POST",
      |    "headers": {
      |        "CloudFront-Forwarded-Proto": "https",
      |        "CloudFront-Is-Desktop-Viewer": "true",
      |        "CloudFront-Is-Mobile-Viewer": "false",
      |        "CloudFront-Is-SmartTV-Viewer": "false",
      |        "CloudFront-Is-Tablet-Viewer": "false",
      |        "CloudFront-Viewer-Country": "US",
      |        "Content-Type": "application/json; charset=utf-8",
      |        "Host": "hosthosthost",
      |        "User-Agent": "Amazon CloudFront",
      |        "Via": "1.1 c154e1d9f76106d9025a8ffb4f4831ae.cloudfront.net (CloudFront), 1.1 11b20299329437ea4e28ea2b556ea990.cloudfront.net (CloudFront)",
      |        "X-Amz-Cf-Id": "hihi",
      |        "X-Amzn-Trace-Id": "Root=1-5a0f2574-4cb4d1534b9f321a3b777624",
      |        "X-Forwarded-For": "1.1.1.1, 1.1.1.1",
      |        "X-Forwarded-Port": "443",
      |        "X-Forwarded-Proto": "https"
      |    },
      |    "queryStringParameters": {
      |        "apiClientId": "a",
      |        "apiToken": "b"
      |    },
      |    "pathParameters": null,
      |    "stageVariables": null,
      |    "requestContext": {
      |        "path": "/CODE/payment-failure",
      |        "accountId": "865473395570",
      |        "resourceId": "ls9b61",
      |        "stage": "CODE",
      |        "requestId": "11111111-cbc2-11e7-a389-b7e6e2ab8316",
      |        "identity": {
      |            "cognitoIdentityPoolId": null,
      |            "accountId": null,
      |            "cognitoIdentityId": null,
      |            "caller": null,
      |            "apiKey": "",
      |            "sourceIp": "1.1.1.1",
      |            "accessKey": null,
      |            "cognitoAuthenticationType": null,
      |            "cognitoAuthenticationProvider": null,
      |            "userArn": null,
      |            "userAgent": "Amazon CloudFront",
      |            "user": null
      |        },
      |        "resourcePath": "/payment-failure",
      |        "httpMethod": "POST",
      |        "apiId": "11111"
      |    },
      |    "body": "{\"accountId\":\"2c92c0f85fc90734015fca884c3f04cf\",\"firstName\":\"eSAFaBwm4WJZNg5xhIc\",\"lastName\":\"eSAFaBwm4WJZNg5xhIc\",\"creditCardExpirationMonth\":\"12\",\"creditCardExpirationYear\":\"2019\",\"paymentId\":\"2c92c0f95fc912eb015fcb2a481720e6\",\"tenantId\":\"c\",\"currency\":\"USD\",\"creditCardType\":\"Visa\",\"paymentMethodType\":\"CreditCardReferenceTransaction\",\"email\":\"john.duffell@guardian.co.uk\",\"failureNumber\":\"1\", \"sfContactId\": \"1000000\"}",
      |    "isBase64Encoded": false
      |}
    """.stripMargin

}
