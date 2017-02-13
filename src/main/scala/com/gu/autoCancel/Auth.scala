package com.gu.autoCancel

import play.api.libs.json.JsValue

object Auth extends Logging {

  def credentialsAreValid(inputEvent: JsValue, trustedApiClientId: String, trustedApiToken: String): Boolean = {

    /* Using query strings because for Basic Auth to work Zuora requires us to return a WWW-Authenticate
    header, and API Gateway does not support this header (returns x-amzn-Remapped-WWW-Authenticate instead)
    */
    val maybeApiClientId = (inputEvent \ "queryStringParameters" \ "apiClientId").asOpt[String]
    val maybeApiClientToken = (inputEvent \ "queryStringParameters" \ "apiToken").asOpt[String]
    val maybeCredentials = (maybeApiClientId, maybeApiClientToken)

    maybeCredentials match {
      case (Some(apiClientId), Some(apiToken)) => {
        (apiClientId == trustedApiClientId && apiToken == trustedApiToken)
      }
      case _ => {
        logger.info(s"Could not find credentials in request")
        false
      }
    }
  }

}
