package com.gu.productmove

import com.amazonaws.services.lambda.runtime.*
import com.gu.productmove.endpoint.available.AvailableProductMovesEndpoint
import com.gu.productmove.endpoint.cancel.SubscriptionCancelEndpoint
import com.gu.productmove.endpoint.move.{ProductMoveEndpoint, ProductMoveEndpointTypes}
import com.gu.productmove.endpoint.updateamount.UpdateSupporterPlusAmountEndpoint
import com.gu.productmove.framework.ZIOApiGatewayRequestHandler
import io.circe.generic.semiauto.*
import io.circe.syntax.*
import sttp.apispec.openapi.Info
import sttp.client3.*
import sttp.tapir.*
import sttp.tapir.docs.openapi.OpenAPIDocsInterpreter
import sttp.tapir.server.ServerEndpoint
import sttp.tapir.serverless.aws.lambda.{AwsHttp, AwsRequest, AwsRequestContext}
import zio.*
import zio.json.*

import java.io.{ByteArrayInputStream, ByteArrayOutputStream}
import java.nio.charset.StandardCharsets
import scala.util.Try

// this handler contains all the endpoints
object Handler
    extends ZIOApiGatewayRequestHandler(
      List(
        AvailableProductMovesEndpoint.server,
        ProductMoveEndpoint.server,
        UpdateSupporterPlusAmountEndpoint.server,
        SubscriptionCancelEndpoint.server,
      ),
    )

object HandlerManualTests {

  private val devSubscriptionNumber = "A-S00737111"

  @main
  // run this to test locally via console with some hard coded data
  def testProductMove(): Unit = runTest(
    "POST",
    "/product-move/recurring-contribution-to-supporter-plus/" + devSubscriptionNumber,
    Some(ProductMoveEndpointTypes.ExpectedInput(49.99, preview = false, None, None).toJson),
  )

  @main
  // run this to test locally via console with some hard coded data
  def testAvailableMoves(): Unit = runTest(
    "GET",
    "/available-product-moves/" + devSubscriptionNumber,
    None,
  )

  @main
  // this will output the yaml to the console
  def testDocs(): Unit = {
    runTest(
      "GET",
      "/docs/docs.yaml",
      None,
    )
  }

  @main
  // this will output the HTML to the console
  def testDocsHtml(): Unit = {
    runTest(
      "GET",
      "/docs/",
      None,
    )
  }

  @main
  def testRealDocsRequest(): Unit = {
    val redactedJson =
      """{"resource":"/docs","path":"/docs/","httpMethod":"GET","headers":{"accept":"text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7","accept-encoding":"gzip, deflate, br","accept-language":"en-GB,en-US;q=0.9,en;q=0.8","cache-control":"max-age=0","Host":"product-move-api-code.support.guardianapis.com","if-modified-since":"Fri, 01 Jan 2010 00:00:00 GMT","if-none-match":"\"blahblah\"","sec-ch-ua":"\"Google Chrome\";v=\"119\", \"Chromium\";v=\"119\", \"Not?A_Brand\";v=\"24\"","sec-ch-ua-mobile":"?0","sec-ch-ua-platform":"\"macOS\"","sec-fetch-dest":"document","sec-fetch-mode":"navigate","sec-fetch-site":"none","sec-fetch-user":"?1","upgrade-insecure-requests":"1","User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36","X-Amzn-Trace-Id":"blahblah","X-Forwarded-For":"1.2.3.4","X-Forwarded-Port":"443","X-Forwarded-Proto":"https"},"multiValueHeaders":{"accept":["text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7"],"accept-encoding":["gzip, deflate, br"],"accept-language":["en-GB,en-US;q=0.9,en;q=0.8"],"cache-control":["max-age=0"],"Host":["product-move-api-code.support.guardianapis.com"],"if-modified-since":["Fri, 01 Jan 2010 00:00:00 GMT"],"if-none-match":["\"blahblah\""],"sec-ch-ua":["\"Google Chrome\";v=\"119\", \"Chromium\";v=\"119\", \"Not?A_Brand\";v=\"24\""],"sec-ch-ua-mobile":["?0"],"sec-ch-ua-platform":["\"macOS\""],"sec-fetch-dest":["document"],"sec-fetch-mode":["navigate"],"sec-fetch-site":["none"],"sec-fetch-user":["?1"],"upgrade-insecure-requests":["1"],"User-Agent":["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"],"X-Amzn-Trace-Id":["blahblah"],"X-Forwarded-For":["1.2.3.4"],"X-Forwarded-Port":["443"],"X-Forwarded-Proto":["https"]},"queryStringParameters":null,"multiValueQueryStringParameters":null,"pathParameters":null,"stageVariables":null,"requestContext":{"resourceId":"blahblah","resourcePath":"/docs","httpMethod":"GET","extendedRequestId":"blahblah","requestTime":"28/Nov/2023:11:48:26 +0000","path":"/docs/","accountId":"1234","protocol":"HTTP/1.1","stage":"CODE","domainPrefix":"product-move-api-code","requestTimeEpoch":1701172106179,"requestId":"blahblah","identity":{"cognitoIdentityPoolId":null,"accountId":null,"cognitoIdentityId":null,"caller":null,"sourceIp":"1.2.3.4","principalOrgId":null,"accessKey":null,"cognitoAuthenticationType":null,"cognitoAuthenticationProvider":null,"userArn":null,"userAgent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36","user":null},"domainName":"product-move-api-code.support.guardianapis.com","apiId":"blahblah"},"body":null,"isBase64Encoded":false}"""
    runStringTest(redactedJson)
  }

  // for testing
  def runTest(method: String, path: String, testInput: Option[String]): Unit = {
    val inputValue = makeTestRequest(method, path, testInput)
    val inputJson = inputValue.asJson(deriveEncoder).spaces2
    runStringTest(inputJson)
  }

  def runStringTest(inputJson: String): Unit = {
    val input = new ByteArrayInputStream(inputJson.getBytes(StandardCharsets.UTF_8))
    val context = new TestContext()
    val output: ByteArrayOutputStream = new ByteArrayOutputStream()
    Handler.handleRequest(input, output, context)
    val response = new String(output.toByteArray, StandardCharsets.UTF_8)
    println(s"response was ${response.length} characters long")
  }

  private def makeTestRequest(method: String, path: String, testInput: Option[String]) = {
    AwsRequest(
      rawPath = path,
      rawQueryString = "",
      headers = Map.empty,
      requestContext = AwsRequestContext(
        domainName = None,
        http = AwsHttp(
          method = method,
          path = path,
          protocol = "",
          sourceIp = "",
          userAgent = "",
        ),
      ),
      body = testInput,
      isBase64Encoded = false,
    )
  }

}

class TestContext() extends Context {
  override def getAwsRequestId: String = ???

  override def getLogGroupName: String = ???

  override def getLogStreamName: String = ???

  override def getFunctionName: String = ???

  override def getFunctionVersion: String = ???

  override def getInvokedFunctionArn: String = ???

  override def getIdentity: CognitoIdentity = ???

  override def getClientContext: ClientContext = ???

  override def getRemainingTimeInMillis: Int = ???

  override def getMemoryLimitInMB: Int = ???

  override def getLogger: LambdaLogger = new LambdaLogger {
    override def log(message: String): Unit = {
      val now = java.time.Instant.now().toString
      println(s"$now: $message")
    }

    override def log(message: Array[Byte]): Unit = println(s"LOG BYTES: ${message.toString}")
  }
}

// called from genDocs command in build.sbt
object MakeDocsYaml {
  import sttp.apispec.openapi.circe.yaml.*

  val description =
    """API to facilitate replacing an existing subscription
      |with another subscription for a different type of product.""".stripMargin

  def main(args: Array[String]): Unit = {
    val endpoints: Iterable[AnyEndpoint] = Handler.server.map(_.endpoint)
    val docs = OpenAPIDocsInterpreter().toOpenAPI(endpoints, Info("Product Movement API", "0.0.1", Some(description)))
    val yaml = docs.toYaml

    args.headOption match {
      case None =>
        println("Syntax: $0 <pathname.yaml>")
      case Some(yamlFilename) if yamlFilename.endsWith(".yaml") =>
        import java.io.*
        val writer = new PrintWriter(new File(yamlFilename))
        val maybeFileOps = Try {
          writer.write(yaml)
        }
        val maybeClose = Try(writer.close)
        maybeFileOps.get // throws
        maybeClose.get // throws
        println("Wrote yaml docs to " + yamlFilename)
      case Some(_) =>
        println("File name passed in must end in .yaml")
    }
  }
}
