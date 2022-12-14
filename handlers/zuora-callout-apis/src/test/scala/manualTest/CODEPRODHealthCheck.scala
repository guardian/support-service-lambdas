package manualTest

import com.gu.effects.S3Location
import com.gu.effects.{GetFromS3, Http}
import com.gu.test.HealthCheck
import okhttp3._
import play.api.libs.json.Json
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

// this test runs the health check from locally. this means you can only run it manually
// you should run the healthcheck in code and in prod after deployments
class CODEPRODHealthCheck extends AnyFlatSpec with Matchers {

  import com.gu.util.reader.Types._

  it should "successfully run the health checks against CODE" taggedAs HealthCheck in {

    healthcheckForEnv(_.CODE)

  }

  it should "successfully run the health checks against PROD" taggedAs HealthCheck in {

    healthcheckForEnv(_.PROD)

  }

  private def healthcheckForEnv(env: HealthChecks => List[HealthCheckConfig]) = {
    val configLocation = S3Location(
      bucket = "gu-reader-revenue-private",
      key = "membership/support-service-lambdas/DEV/support-service-lambdas-healthcheck.private.json",
    )
    val healthchecks = for {
      jsonString <- GetFromS3.fetchString(configLocation).toApiGatewayOp("read local config")
      healthcheck <- Json.parse(jsonString).validate[HealthChecks](HealthChecks.reads).toApiGatewayOp()

    } yield env(healthcheck)

    val expectedResponse =
      """{
        |  "message" : "Success"
        |}
      """.stripMargin
    println(healthchecks)
    healthchecks.toDisjunction.fold(err => fail(s"couldn't load config: $err"), identity).foreach { healthcheck =>
      val responseString = post(healthcheck, Http.response)
      Json.parse(responseString) should be(Json.parse(expectedResponse))
    }
  }

  def post(healthcheck: HealthCheckConfig, response: Request => Response): String = {
    val request = new Request.Builder()
      .url(healthcheck.url)
      .header("x-api-key", healthcheck.apiKey)
      .post(RequestBody.create(MediaType.parse("application/json"), "{}"))
      .build()
    val responseO = response(request)
    if (responseO.isSuccessful) {
      responseO.body().string()
    } else {
      s"RESPONSE CODE: ${responseO.code()}: ${responseO.body().string()}"
    }
  }

}

case class HealthCheckConfig(url: String, apiKey: String)
case class HealthChecks(CODE: List[HealthCheckConfig], PROD: List[HealthCheckConfig])
object HealthCheckConfig {
  implicit val reads = Json.reads[HealthCheckConfig]
}
object HealthChecks {
  implicit val reads = Json.reads[HealthChecks]
}

object HealthCheckData {

  def healthcheckRequest(apiToken: String): String =
    s"""
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
       |        "isHealthcheck": "true",
       |        "apiToken": "$apiToken"
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
       |    "body": "",
       |    "isBase64Encoded": false
       |}
    """.stripMargin

}
