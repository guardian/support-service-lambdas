package com.gu.paymentFailure

import java.io.{ ByteArrayInputStream, ByteArrayOutputStream }

import com.gu.TestData._
import com.gu.TestingRawEffects
import okhttp3.RequestBody
import okhttp3.internal.Util.UTF_8
import okio.Buffer
import org.scalatest.{ FlatSpec, Matchers }

class EndToEndHandlerTest extends FlatSpec with Matchers {

  it should "manage an end to end call" in {

    val stream = new ByteArrayInputStream(EndToEndData.zuoraCalloutJson.getBytes(java.nio.charset.StandardCharsets.UTF_8))
    val os = new ByteArrayOutputStream()
    val config = new TestingRawEffects(false, 200, EndToEndData.responses)
    val effects = config.rawEffects
    val deps = Lambda.default(effects)
    //execute
    deps.handler(stream, os, null)

    //verify
    def body(b: RequestBody): String = {
      val buffer = new Buffer()
      b.writeTo(buffer)
      buffer.readString(UTF_8)
    }

    config.result.map(req => (req.method, req.url.encodedPath) -> Option(req.body).map(body)).toMap
      .get(("POST", "/messaging/v1/messageDefinitionSends/111/send")) should be(
        Some(Some(EndToEndData.expectedEmailSend))
      ) // TODO check the body too

    val responseString = new String(os.toByteArray(), "UTF-8")

    val expectedResponse =
      s"""
         |{"statusCode":"200","headers":{"Content-Type":"application/json"},"body":"Success"}
         |""".stripMargin
    responseString jsonMatches expectedResponse
  }

}

object EndToEndData {

  def responses: Map[String, (Int, String)] = Map(
    ("/transactions/invoices/accounts/2c92c0f85fc90734015fca884c3f04cf", (200, invoices)),
    ("/v1/requestToken", (200, """{"accessToken":"", "expiresIn":1}""")),
    ("/messaging/v1/messageDefinitionSends/111/send", (202, ""))
  )

  val expectedEmailSend =
    """{"To":{"Address":"john.duffell@guardian.co.uk","SubscriberKey":"john.duffell@guardian.co.uk","ContactAttributes":{"SubscriberAttributes":{"subscriber_id":"A-S00071536","product":"Supporter","payment_method":"CreditCardReferenceTransaction","card_type":"Visa","card_expiry_date":"12/2019","first_name":"eSAFaBwm4WJZNg5xhIc","last_name":"eSAFaBwm4WJZNg5xhIc","paymentId":"2c92c0f95fc912eb015fcb2a481720e6","price":"$49.00","serviceStartDate":"17 November 2017","serviceEndDate":"16 November 2018"}}}}"""

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

  val zuoraCalloutJson =
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
      |    "body": "{\"accountId\":\"2c92c0f85fc90734015fca884c3f04cf\",\"firstName\":\"eSAFaBwm4WJZNg5xhIc\",\"lastName\":\"eSAFaBwm4WJZNg5xhIc\",\"creditCardExpirationMonth\":\"12\",\"creditCardExpirationYear\":\"2019\",\"paymentId\":\"2c92c0f95fc912eb015fcb2a481720e6\",\"tenantId\":\"c\",\"currency\":\"USD\",\"creditCardType\":\"Visa\",\"paymentMethodType\":\"CreditCardReferenceTransaction\",\"email\":\"john.duffell@guardian.co.uk\",\"failureNumber\":\"1\"}",
      |    "isBase64Encoded": false
      |}
    """.stripMargin

}