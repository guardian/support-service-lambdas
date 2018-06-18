package com.gu.cancellation.sf_cases

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.RawEffects
import com.gu.salesforce.auth.SalesforceAuthenticate
import com.gu.salesforce.auth.SalesforceAuthenticate.SFAuthConfig
import com.gu.salesforce.cases.SalesforceCase
import com.gu.salesforce.cases.SalesforceCase.CaseResponse
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayRequest}
import com.gu.util.config.ConfigReads.ConfigFailure
import com.gu.util.config.{Config, LoadConfig, Stage}
import com.gu.util.reader.Types._
import okhttp3.{Request, Response}
import play.api.libs.json.{Json, Reads}
import scalaz.\/

object Handler extends Logging {

  //  def main(args: Array[String]): Unit = {
  //    val port = 9000
  //    val server = HttpServer.create(new InetSocketAddress(port), 0)
  //    System.out.println("server started at " + port)
  //    server.createContext("/", (httpExchange: HttpExchange) => {
  //      val bytes = "hello".getBytes()
  //      httpExchange.sendResponseHeaders(200, bytes.length)
  //      val os: OutputStream = httpExchange.getResponseBody
  //      os.write(bytes)
  //      os.flush()
  //      os.close()
  //    })
  //    server.setExecutor(null)
  //    server.start()
  //  }

  case class StepsConfig(sfConfig: SFAuthConfig)
  case class RequestBody(subscriptionName: String)

  implicit val stepsConfigReads: Reads[StepsConfig] = Json.reads[StepsConfig]

  // Referenced in Cloudformation
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    runWithEffects(RawEffects.response, RawEffects.stage, RawEffects.s3Load, LambdaIO(inputStream, outputStream, context))

  def runWithEffects(response: Request => Response, stage: Stage, s3Load: Stage => ConfigFailure \/ String, lambdaIO: LambdaIO) = {

    def operation: Config[StepsConfig] => Operation = config => {

      implicit val reads = Json.reads[RequestBody]
      implicit val responseBodyWrites = Json.writes[CaseResponse]

      def steps(apiGatewayRequest: ApiGatewayRequest) = {
        (for {
          sfRequests <- SalesforceAuthenticate(response, config.stepsConfig.sfConfig)
          requestBody <- apiGatewayRequest.bodyAsCaseClass[RequestBody]()
          raiseCaseResponse <- SalesforceCase.Raise(sfRequests)().toApiGatewayOp("raise case")
        } yield ApiResponse("200", Json.prettyPrint(Json.toJson(raiseCaseResponse)))).apiResponse
      }

      Operation.noHealthcheck(steps, false)

    }

    ApiGatewayHandler[StepsConfig](lambdaIO)(for {
      config <- LoadConfig.default[StepsConfig](implicitly)(stage, s3Load(stage)).toApiGatewayOp("load config")
      configuredOp = operation(config)
    } yield (config, configuredOp))

  }

}
