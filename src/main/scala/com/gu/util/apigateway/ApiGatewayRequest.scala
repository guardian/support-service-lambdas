package com.gu.util.apigateway

import play.api.libs.json.Json

case class RequestAuth(apiClientId: String, apiToken: String)
case class URLParams(apiClientId: Option[String], apiToken: Option[String], onlyCancelDirectDebit: Option[String])

/* Using query strings because for Basic Auth to work Zuora requires us to return a WWW-Authenticate
  header, and API Gateway does not support this header (returns x-amzn-Remapped-WWW-Authenticate instead)
  */
case class ApiGatewayRequest(queryStringParameters: Option[URLParams], body: String) {
  def onlyCancelDirectDebit: Boolean = queryStringParameters.exists(_.onlyCancelDirectDebit.contains("true"))
  def requestAuth: Option[RequestAuth] =
    for {
      queryStringParameters <- queryStringParameters
      apiClientId <- queryStringParameters.apiClientId
      apiToken <- queryStringParameters.apiToken
    } yield RequestAuth(apiClientId, apiToken)
}

object URLParams {
  implicit val jf = Json.reads[URLParams]
}

object ApiGatewayRequest {
  implicit val jf = Json.reads[ApiGatewayRequest]
}
