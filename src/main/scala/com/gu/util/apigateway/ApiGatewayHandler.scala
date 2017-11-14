package com.gu.util.apigateway

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{ConfigLoad, Logging, StateHttpWithEffects}
import com.gu.util.Auth.{credentialsAreValid, validTenant}
import com.gu.util._
import com.gu.util.apigateway.ApiGatewayResponse.{outputForAPIGateway, successfulExecution, unauthorized}
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.zuora.Types._
import play.api.libs.json.Json

import scala.io.Source
import scala.util.Try
import scalaz.{-\/, Reader, \/, \/-}

object ApiGatewayHandler extends Logging {

  //  code dependencies
  case class HandlerDeps(
    configAttempt: String => Try[String],
    parseConfig: String => Try[Config],

    getStateHttp: Config => StateHttp

  )

  val defaultHandlerDeps = HandlerDeps(
    configAttempt = ConfigLoad.load,
    parseConfig = Config.parseConfig,
    getStateHttp = StateHttpWithEffects.apply
  )

  /* Entry point for our Lambda - this takes the input event from API Gateway,
  extracts the JSON body and then hands over to cancellationAttemptForPayload for the 'real work'.
  */
  def handleRequest(inputStream: InputStream, outputStream: OutputStream, context: Context, stage: String, lambdaConfig: HandlerDeps = defaultHandlerDeps)(operation: ApiGatewayRequest => ZuoraOp[Unit]): Unit = {
    logger.info(s"${this.getClass} Lambda is starting up in ${stage}")
    val jsonString = Source.fromInputStream(inputStream).mkString
    logger.info(s"payload from api gateway is: $jsonString")
    val response = for {
      config <- lambdaConfig.configAttempt(stage).flatMap(lambdaConfig.parseConfig).toFailableOp("load config")
      apiGatewayRequest <- Json.parse(jsonString).validate[ApiGatewayRequest].toFailableOp
      auth <- authenticateCallout(apiGatewayRequest.requestAuth, config.trustedApiConfig)
      _ = logger.info("Authenticated request successfully...")
      _ = logger.info(s"Body from Zuora was: ${apiGatewayRequest.body}")
      stateHttp = lambdaConfig.getStateHttp(config)
      _ <- operation(apiGatewayRequest).run(stateHttp)
    } yield ()
    outputForAPIGateway(outputStream, response.fold(identity, _ => successfulExecution))
  }

  def authenticateCallout(requestAuth: Option[RequestAuth], trustedApiConfig: TrustedApiConfig): ApiResponse \/ Unit = {
    if (credentialsAreValid(requestAuth, trustedApiConfig)) \/-(()) else -\/(unauthorized)
  }

  def validateTenantCallout(calloutTenantId: String): ZuoraOp[Unit] = ZuoraOp(Reader({ zhttp: StateHttp =>
    val trustedApiConfig: TrustedApiConfig = zhttp.config.trustedApiConfig
    if (validTenant(trustedApiConfig, calloutTenantId)) \/-(()) else -\/(unauthorized)
  }))

}
