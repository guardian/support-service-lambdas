package com.gu.productmove

import com.amazonaws.services.lambda.runtime.*
import com.amazonaws.services.lambda.runtime.events.{APIGatewayV2HTTPEvent, APIGatewayV2HTTPResponse}
import zio.{IO, Runtime, ZIO}

trait ZIOApiGatewayRequestHandler extends RequestHandler[APIGatewayV2HTTPEvent, APIGatewayV2HTTPResponse] {

  val testInput: String

  // for testing
  def main(args: Array[String]): Unit = {
    val input = new APIGatewayV2HTTPEvent(
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      testInput,
      false,
      null
    )
    val context = new Context {
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

      override def getLogger: LambdaLogger = ???
    }
    val response = handleRequest(input, context)
    println("response: " + response)
  }

  // this is the main lambda entry point.  It is referenced in the cloudformation.
  override def handleRequest(input: APIGatewayV2HTTPEvent, context: Context): APIGatewayV2HTTPResponse =
    Runtime.default.unsafeRun(
      run(input).catchAll { error =>
        ZIO.log(error.toString)
          .map(_ => APIGatewayV2HTTPResponse.builder().withStatusCode(500).build())
      }
    )

  protected def run(input: APIGatewayV2HTTPEvent): IO[Any, APIGatewayV2HTTPResponse]

}
