package com.gu.util.apigateway

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.util.Auth.credentialsAreValid
import com.gu.util.Config.ConfigFailure
import com.gu.util._
import com.gu.util.apigateway.ApiGatewayResponse.{outputForAPIGateway, successfulExecution, unauthorized}
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.reader.Types.{FailableOp, _}
import play.api.libs.json.{Json, Reads}

import scala.io.Source
import scala.util.Try
import scalaz.{-\/, Reader, \/, \/-}

object ApiGatewayHandler extends Logging {

  case class LambdaIO(inputStream: InputStream, outputStream: OutputStream, context: Context)

  def parseApiGatewayRequest(inputStream: InputStream): FailableOp[ApiGatewayRequest] = {
    for {

      jsonString <- inputFromApiGateway(inputStream).toFailableOp("get json data from API gateway").withLogging("payload from api gateway")
      apiGatewayRequest <- Json.parse(jsonString).validate[ApiGatewayRequest].toFailableOp.withLogging("parsed api gateway object")

    } yield apiGatewayRequest
  }

  private def inputFromApiGateway(inputStream: InputStream) = {
    Try {
      Source.fromInputStream(inputStream).mkString
    }
  }

  def authenticateCallout(requestAuth: Option[RequestAuth], trustedApiConfig: TrustedApiConfig): ApiResponse \/ Unit = {
    if (credentialsAreValid(requestAuth, trustedApiConfig)) \/-(()) else -\/(unauthorized)
  }

  def default[StepsConfig: Reads](operation: Config[StepsConfig] => ApiGatewayRequest => FailableOp[Unit], io: LambdaIO): Reader[(Stage, Try[String]), Unit] =
    apply(LoadConfig.default[StepsConfig], operation, io)

  def apply[StepsConfig](
    loadConfig: Reader[(Stage, Try[String]), FailableOp[Config[StepsConfig]]],
    operation: Config[StepsConfig] => ApiGatewayRequest => FailableOp[Unit],
    lambdaIO: LambdaIO
  ): Reader[(Stage, Try[String]), Unit] = {

    import lambdaIO._

    loadConfig.map { failableConfig =>
      val response = for {
        config <- failableConfig
        apiGatewayRequest <- parseApiGatewayRequest(inputStream)
        _ <- authenticateCallout(apiGatewayRequest.requestAuth, config.trustedApiConfig).withLogging("authentication")
        _ <- operation(config)(apiGatewayRequest)
      } yield ()

      outputForAPIGateway(outputStream, response.fold(identity, _ => successfulExecution))
    }

  }

}

object LoadConfig extends Logging {

  def default[StepsConfig: Reads]: Reader[(Stage, Try[String]), FailableOp[Config[StepsConfig]]] = loadConfig(Config.parseConfig[StepsConfig] _)

  def loadConfig[StepsConfig](parseConfig: String => \/[ConfigFailure, Config[StepsConfig]]): Reader[(Stage, Try[String]), FailableOp[Config[StepsConfig]]] = Reader {
    case (stage, s3Load) =>

      logger.info(s"${this.getClass} Lambda is starting up in $stage")

      for {

        textConfig <- s3Load.toFailableOp("load config from s3")
        config <- parseConfig(textConfig).toFailableOp("parse config file")
        _ <- if (stage == config.stage) { \/-(()) } else { -\/(ApiGatewayResponse.internalServerError(s"running in $stage with config from ${config.stage}")) }

      } yield config
  }

}

