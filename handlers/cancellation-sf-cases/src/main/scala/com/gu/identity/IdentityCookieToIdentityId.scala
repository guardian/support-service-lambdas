package com.gu.identity

import com.gu.identity.cookie.{IdentityCookieDecoder, PreProductionKeys}
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import com.gu.util.reader.Types._

object IdentityCookieToIdentityId extends Logging {

  lazy val badRequest = ReturnWithResponse(ApiGatewayResponse.badRequest)

  def apply(headersOption: Option[Map[String, String]]): ApiGatewayOp[String] = headersOption match {
    case Some(headers) => processHeaders(headers)
    case None => {
      logger.debug("no headers")
      badRequest
    }
  }

  private def processHeaders(headers: Map[String, String]): ApiGatewayOp[String] =
    headers get "Cookie" match {
      case Some(cookie) => processCookie(cookie, new IdentityCookieDecoder(new PreProductionKeys)) // TODO review keys selection
      case None => {
        logger.debug("no cookie")
        badRequest
      }
    }

  private def processCookie(cookieHeaderValue: String, cookieDecoder: IdentityCookieDecoder) =
    for {
      scGuU <- extractCookieHeaderValue(cookieHeaderValue, "SC_GU_U")
      userFromScGuU <- cookieDecoder.getUserDataForScGuU(scGuU).toApiGatewayContinueProcessing(ApiGatewayResponse.unauthorized)
    } yield userFromScGuU.getId

  private def extractCookieHeaderValue(cookieHeaderValue: String, cookieName: String): ApiGatewayOp[String] =
    cookieHeaderValue split ";" find (keyValue => keyValue.trim startsWith (cookieName + '=')) match {
      case Some(keyValue) => ContinueProcessing(keyValue.substring(keyValue.indexOf('=') + 1))
      case None => {
        logger.debug(cookieName + " cookie is missing")
        badRequest
      }
    }

}
