package com.gu.util.apigateway

import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayResponse.unauthorized
import com.gu.util.config.ConfigLocation
import com.gu.util.config.ConfigReads.ConfigFailure
import com.gu.util.reader.Types.{ApiGatewayOp, _}
import play.api.libs.json.{Json, Reads}

object Auth extends Logging {

  case class RequestAuth(apiToken: Option[String])

  object RequestAuth {
    implicit val reads: Reads[RequestAuth] = Json.reads[RequestAuth]
  }

  case class TrustedApiConfig(apiToken: String, tenantId: String)

  object TrustedApiConfig {
    implicit val location = ConfigLocation[TrustedApiConfig](path = "trustedApi", version = 1)
    implicit val apiConfigReads = Json.reads[TrustedApiConfig]
  }

  def apply(
      loadConfigModule: Either[ConfigFailure, TrustedApiConfig],
  )(apiGatewayRequest: ApiGatewayRequest): ApiGatewayOp[Unit] = {
    for {
      trustedApiConfig <- loadConfigModule.toApiGatewayOp("load trusted Api config")
      requestAuth <- apiGatewayRequest.queryParamsAsCaseClass[RequestAuth]()
      _ <- credentialsAreValid(trustedApiConfig, requestAuth)
        .toApiGatewayContinueProcessing(unauthorized)
        .withLogging("authentication")
    } yield ()
  }

  def credentialsAreValid(trustedApiConfig: TrustedApiConfig, requestAuth: RequestAuth): Boolean =
    requestAuth.apiToken.contains(trustedApiConfig.apiToken)

  // Ensure that the correct Zuora environment is hitting the API
  def validTenant(trustedApiConfig: TrustedApiConfig, tenantId: String): Boolean = {
    tenantId == trustedApiConfig.tenantId
  }

}
