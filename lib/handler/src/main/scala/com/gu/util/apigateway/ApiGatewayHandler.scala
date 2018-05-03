package com.gu.util.apigateway

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.util.Auth.credentialsAreValid
import com.gu.util.Config.ConfigFailure
import com.gu.util.apigateway.ApiGatewayResponse.{outputForAPIGateway, successfulExecution, unauthorized}
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.reader.Types.{FailableOp, _}
import com.gu.util.{Stage, _}
import play.api.libs.json.{Json, Reads}
import scalaz.{-\/, \/, \/-}

import scala.io.Source
import scala.util.Try

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

  def authenticateCallout(shouldAuthenticate: Boolean, requestAuth: Option[RequestAuth], trustedApiConfig: TrustedApiConfig): ApiResponse \/ Unit = {
    if (!shouldAuthenticate || credentialsAreValid(requestAuth, trustedApiConfig)) \/-(()) else -\/(unauthorized)
  }

  case class Operation(steps: ApiGatewayRequest => FailableOp[Unit], healthcheck: () => FailableOp[Unit], shouldAuthenticate: Boolean = true)
  object Operation {
    def noHealthcheck(steps: ApiGatewayRequest => FailableOp[Unit], shouldAuthenticate: Boolean = true) =
      Operation(steps, () => \/-(()), shouldAuthenticate)
  }

  def apply[StepsConfig](
    lambdaIO: LambdaIO
  )(
    fConfigOp: FailableOp[(Config[StepsConfig], Operation)]
  ): Unit = {

    import lambdaIO._

    val response = for {
      configOp <- fConfigOp
      (config, operation) = configOp
      apiGatewayRequest <- parseApiGatewayRequest(inputStream)
      _ <- if (apiGatewayRequest.queryStringParameters.exists(_.isHealthcheck)) operation.healthcheck().withLogging("healthcheck") else for {
        _ <- authenticateCallout(operation.shouldAuthenticate, apiGatewayRequest.requestAuth, config.trustedApiConfig).withLogging("authentication")
        _ <- operation.steps(apiGatewayRequest).withLogging("steps")
      } yield ()
    } yield ()

    outputForAPIGateway(outputStream, response.fold(identity, _ => successfulExecution))

  }

}

object LoadConfig extends Logging {

  def default[StepsConfig: Reads]: (Stage, Try[String]) => FailableOp[Config[StepsConfig]] = apply[StepsConfig](Config.parseConfig[StepsConfig])

  def apply[StepsConfig](parseConfig: String => ConfigFailure \/ Config[StepsConfig])(stage: Stage, s3Load: Try[String]): FailableOp[Config[StepsConfig]] = {

    logger.info(s"${this.getClass} Lambda is starting up in $stage")

    for {

      textConfig <- s3Load.toFailableOp("load config from s3")
      config <- parseConfig(textConfig).toFailableOp("parse config file")
      _ <- if (stage == config.stage) { \/-(()) } else { -\/(ApiGatewayResponse.internalServerError(s"running in $stage with config from ${config.stage}")) }

    } yield config
  }

}

