package com.gu.identity

import com.gu.identity.cookie.{IdentityCookieDecoder, PreProductionKeys, ProductionKeys}
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayResponse._
import com.gu.util.reader.Types._

object IdentityCookieToIdentityUser extends Logging {

  type CookieValuesToIdentityUser = (String, String) => Option[IdentityUser]

  final case class IdentityId(value: String) extends AnyVal

  case class IdentityUser(id: IdentityId, displayName: Option[String])

  def apply(
    cookiesToIdentityUser: CookieValuesToIdentityUser
  )(
    headersOption: Option[Map[String, String]]
  ): ApiGatewayOp[IdentityUser] =
    for {
      headers <- headersOption.toApiGatewayContinueProcessing(badRequest("no headers"))
      cookieHeader <- headers.get("Cookie").toApiGatewayContinueProcessing(badRequest("no cookie"))
      scGuU <- extractCookieHeaderValue(cookieHeader, "SC_GU_U")
      guU <- extractCookieHeaderValue(cookieHeader, "GU_U")
      identityUser <- cookiesToIdentityUser(scGuU, guU).toApiGatewayContinueProcessing(unauthorized)
    } yield identityUser

  private def extractCookieHeaderValue(cookieHeader: String, specificCookieName: String): ApiGatewayOp[String] = {
    val specificCookieValueOption = for {
      keyValues <- Some(cookieHeader split ";")
      keyValue <- keyValues.find(keyValue => keyValue.trim startsWith (specificCookieName + '='))
    } yield keyValue.substring(keyValue.indexOf('=') + 1)

    specificCookieValueOption.toApiGatewayContinueProcessing(badRequest(specificCookieName + " cookie is missing"))
  }

  def defaultCookiesToIdentityUser(isProd: Boolean)(scGuU: String, guU: String) = {
    val keys = if (isProd) new ProductionKeys else new PreProductionKeys
    val cookieDecoder = new IdentityCookieDecoder(keys)
    for {
      userFromScGuU <- cookieDecoder.getUserDataForScGuU(scGuU)
      userFromGuU <- cookieDecoder.getUserDataForGuU(guU)
      displayName = if (userFromScGuU.id equals userFromGuU.user.id)
        userFromGuU.user.publicFields.displayName
      else None
    } yield IdentityUser(IdentityId(userFromScGuU.id), displayName)
  }

}
