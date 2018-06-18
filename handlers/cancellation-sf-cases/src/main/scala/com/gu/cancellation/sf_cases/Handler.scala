package com.gu.cancellation.sf_cases

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.RawEffects
import com.gu.salesforce.auth.SalesforceAuthenticate
import com.gu.salesforce.auth.SalesforceAuthenticate.SFAuthConfig
import com.gu.salesforce.cases.SalesforceCase
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayRequest, ApiGatewayResponse}
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

  case class StepsConfig(sfAuthConfig: SFAuthConfig)
  case class RaisePostBody(subName: String)

  implicit val stepsConfigReads: Reads[StepsConfig] = Json.reads[StepsConfig]

  // Referenced in Cloudformation
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    logger.info("entered lambda")
    runWithEffects(RawEffects.response, RawEffects.stage, RawEffects.s3Load, LambdaIO(inputStream, outputStream, context))
  }

  def runWithEffects(response: Request => Response, stage: Stage, s3Load: Stage => ConfigFailure \/ String, lambdaIO: LambdaIO) = {

    def operation: Config[StepsConfig] => Operation = config => {

      logger.info("got config")

      implicit val reads = Json.reads[RaisePostBody]

      def steps(apiGatewayRequest: ApiGatewayRequest) = {
        (for {
          postRequestBody <- apiGatewayRequest.bodyAsCaseClass[RaisePostBody]()
          //          sfRequests <- SalesforceAuthenticate(response, config.stepsConfig.sfAuthConfig)
          //          caseCreated <- SalesforceCase.Raise(sfRequests)(postRequestBody.subName).toApiGatewayOp("raise case")
          //          _ <- ApiGatewayResponse.outputForAPIGateway()
        } yield ApiGatewayResponse.successfulExecution).apiResponse
      }

      Operation.noHealthcheck(steps)

    }

    ApiGatewayHandler[StepsConfig](lambdaIO)(for {
      config <- LoadConfig.default[StepsConfig](implicitly)(stage, s3Load(stage)).toApiGatewayOp("load config")
      configuredOp = operation(config)
    } yield (config, configuredOp))

  }

}
