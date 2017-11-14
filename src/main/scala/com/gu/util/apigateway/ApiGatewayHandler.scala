package com.gu.util.apigateway

import java.io.{ InputStream, OutputStream }

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{ Logging, StateHttp }
import com.gu.util.Auth.{ credentialsAreValid, validTenant }
import com.gu.util._
import com.gu.util.apigateway.ApiGatewayResponse.{ outputForAPIGateway, successfulExecution, unauthorized }
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.zuora.Types._
import play.api.libs.json.Json

import scala.io.Source
import scala.util.Try
import scalaz.{ -\/, \/, \/- }

object ApiGatewayHandler extends Logging {

  case class LambdaConfig(
    configAttempt: Try[Config],
    stage: String,

    getZuoraRestService: Try[StateHttp],
    operation: (ApiGatewayRequest, Config) => ZuoraOp[Unit]
  )

  /* Entry point for our Lambda - this takes the input event from API Gateway,
  extracts the JSON body and then hands over to cancellationAttemptForPayload for the 'real work'.
  */
  def handleRequest(inputStream: InputStream, outputStream: OutputStream, context: Context)(lambdaConfig: LambdaConfig): Unit = {
    logger.info(s"${this.getClass} Lambda is starting up in ${lambdaConfig.stage}")
    val jsonString = Source.fromInputStream(inputStream).mkString
    logger.info(s"payload from api gateway is: $jsonString")
    val response = for {
      config <- lambdaConfig.configAttempt.toFailableOp("load config")
      apiGatewayRequest <- Json.parse(jsonString).validate[ApiGatewayRequest].toFailableOp
      auth <- authenticateCallout(apiGatewayRequest.requestAuth, config.trustedApiConfig)
      _ = logger.info("Authenticated request successfully...")
      _ = logger.info(s"Body from Zuora was: ${apiGatewayRequest.body}")
      zuoraService <- lambdaConfig.getZuoraRestService.toFailableOp("getZuoraRestService")
      _ <- lambdaConfig.operation(apiGatewayRequest, config).run(zuoraService)
    } yield ()
    outputForAPIGateway(outputStream, response.fold(identity, _ => successfulExecution))
  }

  def authenticateCallout(requestAuth: Option[RequestAuth], trustedApiConfig: TrustedApiConfig): ApiResponse \/ Unit = {
    if (credentialsAreValid(requestAuth, trustedApiConfig)) \/-(()) else -\/(unauthorized)
  }

  def validateTenantCallout(calloutTenantId: String, trustedApiConfig: TrustedApiConfig): ApiResponse \/ Unit = {
    if (validTenant(trustedApiConfig, calloutTenantId)) \/-(()) else -\/(unauthorized)
  }

}
