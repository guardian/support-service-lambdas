package com.gu.util.apigateway

import java.io.{ InputStream, OutputStream }

import com.amazonaws.services.lambda.runtime.Context
import com.gu.util.Auth.{ credentialsAreValid, validTenant }
import com.gu.util._
import com.gu.util.apigateway.ApiGatewayResponse.{ outputForAPIGateway, successfulExecution, unauthorized }
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.reader.Types._
import play.api.libs.json.Json

import scala.io.Source
import scala.util.Try
import scalaz.{ -\/, Reader, \/, \/- }

object ApiGatewayHandler extends Logging {

  //  code dependencies
  case class HandlerDeps(
    parseConfig: String => Try[Config] = Config.parseConfig
  )

  def apply(rawEffects: Try[HttpAndConfig[String]], deps: HandlerDeps = HandlerDeps())(operation: ApiGatewayRequest => all#ImpureFunctionsFailableOp[Unit])(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    val failableZhttp: FailableOp[HttpAndConfig[Config]] =
      for {
        rawEffects <- rawEffects.toFailableOp("load config from s3")
        _ = logger.info(s"${this.getClass} Lambda is starting up in ${rawEffects.stage}")
        config <- deps.parseConfig(rawEffects.config).toFailableOp("load config")
      } yield HttpAndConfig(rawEffects.response, rawEffects.stage, config)
    val jsonString = Source.fromInputStream(inputStream).mkString
    logger.info(s"payload from api gateway is: $jsonString")
    val response = for {
      stateHttp <- failableZhttp
      apiGatewayRequest <- Json.parse(jsonString).validate[ApiGatewayRequest].toFailableOp
      auth <- authenticateCallout(apiGatewayRequest.requestAuth, stateHttp.config.trustedApiConfig)
      _ = logger.info("Authenticated request successfully...")
      _ = logger.info(s"Body from Zuora was: ${apiGatewayRequest.body}")
      _ <- operation(apiGatewayRequest).run.run(stateHttp)
    } yield ()
    outputForAPIGateway(outputStream, response.fold(identity, _ => successfulExecution))
  }

  def authenticateCallout(requestAuth: Option[RequestAuth], trustedApiConfig: TrustedApiConfig): ApiResponse \/ Unit = {
    if (credentialsAreValid(requestAuth, trustedApiConfig)) \/-(()) else -\/(unauthorized)
  }

  def validateTenantCallout(calloutTenantId: String): all#ImpureFunctionsFailableOp[Unit] = ImpureFunctionsFailableOp(Reader({ configHttp =>
    val trustedApiConfig: TrustedApiConfig = configHttp.config.trustedApiConfig
    if (validTenant(trustedApiConfig, calloutTenantId)) \/-(()) else -\/(unauthorized)
  }))

}
