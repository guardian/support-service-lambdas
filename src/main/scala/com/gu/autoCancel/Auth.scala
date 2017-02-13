package com.gu.autoCancel

import play.api.libs.json.JsValue

object Auth extends Logging {

  def credentialsAreValid(inputEvent: JsValue, username: String, password: String): Boolean = {

    /* Using query strings because for Basic Auth to work Zuora requires us to return a WWW-Authenticate
    header, and API Gateway does not support this header (returns x-amzn-Remapped-WWW-Authenticate instead)
    */
    val maybeUsernameValue = (inputEvent \ "queryStringParameters" \ "apiuser").asOpt[String]
    val maybePasswordValue = (inputEvent \ "queryStringParameters" \ "apipass").asOpt[String]
    val maybeCredentials = (maybeUsernameValue, maybePasswordValue)

    maybeCredentials match {
      case (Some(apiuser), Some(apipass)) => {
        (apiuser == username && apipass == password)
      }
      case _ => {
        logger.info(s"Could not find credentials in request")
        false
      }
    }
  }

}
