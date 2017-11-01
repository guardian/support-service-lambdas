package com.gu.util

import com.gu.autoCancel.AutoCancelHandler.RequestAuth
import com.gu.paymentFailure.PaymentFailureCallout
import play.api.libs.json.JsValue

object Auth extends Logging {

  def credentialsAreValid(requestAuth: RequestAuth, trustedApiConfig: TrustedApiConfig): Boolean =
    (requestAuth.apiClientId == trustedApiConfig.apiClientId && requestAuth.apiToken == trustedApiConfig.apiToken)

  def deprecatedCredentialsAreValid(inputEvent: JsValue, trustedApiConfig: TrustedApiConfig): Boolean = {
    /* Using query strings because for Basic Auth to work Zuora requires us to return a WWW-Authenticate
    header, and API Gateway does not support this header (returns x-amzn-Remapped-WWW-Authenticate instead)
    */
    val maybeApiClientId = (inputEvent \ "queryStringParameters" \ "apiClientId").asOpt[String]
    val maybeApiClientToken = (inputEvent \ "queryStringParameters" \ "apiToken").asOpt[String]
    val maybeCredentials = (maybeApiClientId, maybeApiClientToken)

    maybeCredentials match {
      case (Some(apiClientId), Some(apiToken)) => {
        (apiClientId == trustedApiConfig.apiClientId && apiToken == trustedApiConfig.apiToken)
      }
      case _ => {
        logger.info(s"Could not find credentials in request")
        false
      }
    }
  }

  // Ensure that the correct Zuora environment is hitting the API
  def validTenant(trustedApiConfig: TrustedApiConfig, paymentFailureCallout: PaymentFailureCallout): Boolean = {
    paymentFailureCallout.tenantId == trustedApiConfig.tenantId
  }

}
