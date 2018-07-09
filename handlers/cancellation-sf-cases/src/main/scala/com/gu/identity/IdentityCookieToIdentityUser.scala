package com.gu.identity

import com.gu.identity.cookie.{IdentityCookieDecoder, PreProductionKeys, ProductionKeys}
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayResponse._
import com.gu.util.config.Stage
import com.gu.util.reader.Types._

object IdentityCookieToIdentityUser extends Logging {

  case class IdentityUser(id: String, displayName: Option[String] = None)

  def apply(headersOption: Option[Map[String, String]], stage: Stage): ApiGatewayOp[IdentityUser] =
    for {
      headers <- headersOption.toApiGatewayContinueProcessing(badRequest, "no headers")
      cookieHeader <- headers.get("Cookie").toApiGatewayContinueProcessing(badRequest, "no cookie")
      scGuU <- extractCookieHeaderValue(cookieHeader, "SC_GU_U")
      guU <- extractCookieHeaderValue(cookieHeader, "GU_U")
      keys = if (stage.isProd) new ProductionKeys else new PreProductionKeys
      cookieDecoder = new IdentityCookieDecoder(keys)
      userFromScGuU <- cookieDecoder.getUserDataForScGuU(scGuU).toApiGatewayContinueProcessing(unauthorized)
      userFromGuU <- cookieDecoder.getUserDataForGuU(guU).toApiGatewayContinueProcessing(unauthorized)
      displayName = if (userFromScGuU.id equals userFromGuU.getUser.id) userFromGuU.getUser.publicFields.displayName else None
    } yield IdentityUser(userFromScGuU.id, displayName)

  private def extractCookieHeaderValue(cookieHeader: String, specificCookieName: String): ApiGatewayOp[String] = {
    val specificCookieValueOption = for {
      keyValues <- Some(cookieHeader split ";")
      keyValue <- keyValues.find(keyValue => keyValue.trim startsWith (specificCookieName + '='))
    } yield keyValue.substring(keyValue.indexOf('=') + 1)

    specificCookieValueOption.toApiGatewayContinueProcessing(badRequest, specificCookieName + " cookie is missing")
  }

}
