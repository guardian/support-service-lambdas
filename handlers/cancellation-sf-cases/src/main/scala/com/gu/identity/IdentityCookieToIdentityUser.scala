package com.gu.identity

import com.gu.identity.auth.{IdentityAuthService, UserCredentials}
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayResponse._
import com.gu.util.reader.Types._
import org.http4s.Uri

object IdentityCookieToIdentityUser extends Logging {

  type CookieValuesToIdentityUser = String => Option[IdentityUser]

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
      identityUser <- cookiesToIdentityUser(scGuU).toApiGatewayContinueProcessing(unauthorized)
    } yield identityUser

  private def extractCookieHeaderValue(cookieHeader: String, specificCookieName: String): ApiGatewayOp[String] = {
    val specificCookieValueOption = for {
      keyValues <- Some(cookieHeader split ";")
      keyValue <- keyValues.find(keyValue => keyValue.trim startsWith (specificCookieName + '='))
    } yield keyValue.substring(keyValue.indexOf('=') + 1)

    specificCookieValueOption.toApiGatewayContinueProcessing(badRequest(specificCookieName + " cookie is missing"))
  }

  private def getIdentityApiUri(isProd: Boolean): Uri = {
    val raw = if (isProd) "https://idapi.theguardian.com" else "https://idap.code.dev-theguardian.com"
    Uri.unsafeFromString(raw)
  }

  private def serverAccessToken: String =
    Option(System.getenv("IdentityApiServerAccessToken"))
      // TODO: is throwing an execption ok?
      .getOrElse(throw new RuntimeException("environment variable IdentityApiServerAccessToken not exported."))

  def defaultCookiesToIdentityUser(isProd: Boolean)(scGuU: String): Option[IdentityUser] = {
    val uri = getIdentityApiUri(isProd)

    val identityAuthService = {
      import scala.concurrent.ExecutionContext.Implicits.global
      IdentityAuthService.unsafeInit(uri, serverAccessToken)
    }

    identityAuthService.getUserFromCredentials(UserCredentials.SCGUUCookie(scGuU))
      .map(user => IdentityUser(IdentityId(user.id), user.publicFields.displayName))
      .attempt
      .unsafeRunSync()
      .fold(
        err => {
          logger.error("unable to authenticate user", err)
          None
        },
        user => Some(user)
      )
  }
}
