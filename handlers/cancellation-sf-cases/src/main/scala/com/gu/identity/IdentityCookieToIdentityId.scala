package com.gu.identity

import com.gu.identity.cookie.{IdentityCookieDecoder, PreProductionKeys}
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayResponse._
import com.gu.util.reader.Types._

object IdentityCookieToIdentityId extends Logging {

  def apply(headersOption: Option[Map[String, String]]): ApiGatewayOp[String] = for {
    headers <- headersOption.toApiGatewayContinueProcessing(badRequest, "no headers")
    cookieHeader <- headers.get("Cookie").toApiGatewayContinueProcessing(badRequest, "no cookie")
    scGuU <- extractCookieHeaderValue(cookieHeader, "SC_GU_U")
    cookieDecoder = new IdentityCookieDecoder(new PreProductionKeys) // TODO review keys selection
    userFromScGuU <- cookieDecoder.getUserDataForScGuU(scGuU).toApiGatewayContinueProcessing(unauthorized)
  } yield userFromScGuU.getId

  private def extractCookieHeaderValue(cookieHeader: String, specificCookieName: String): ApiGatewayOp[String] = {
    val specificCookieValueOption = for {
      keyValues <- Some(cookieHeader split ";")
      keyValue <- keyValues.find(keyValue => keyValue.trim startsWith (specificCookieName + '='))
    } yield keyValue.substring(keyValue.indexOf('=') + 1)

    specificCookieValueOption.toApiGatewayContinueProcessing(badRequest, specificCookieName + " cookie is missing")
  }

}
