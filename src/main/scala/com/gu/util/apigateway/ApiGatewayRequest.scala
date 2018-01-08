package com.gu.util.apigateway

import play.api.libs.json._
import play.api.libs.functional.syntax._

case class RequestAuth(apiToken: String)

sealed abstract class StripeAccount(val string: String)
object StripeAccount {
  case object GNM_Membership_AUS extends StripeAccount("GNM_Membership_AUS")
  case object GNM_Membership extends StripeAccount("GNM_Membership")
  val all = Seq(GNM_Membership, GNM_Membership_AUS)

  def fromString(string: String): Option[StripeAccount] = {
    all.find(_.string == string)
  }

  implicit val reads: Reads[StripeAccount] = JsPath.read[String].map(fromString(_).get)
}
case class URLParams(apiToken: Option[String], onlyCancelDirectDebit: Boolean, stripeAccount: Option[StripeAccount])

/* Using query strings because for Basic Auth to work Zuora requires us to return a WWW-Authenticate
  header, and API Gateway does not support this header (returns x-amzn-Remapped-WWW-Authenticate instead)
  */
case class ApiGatewayRequest(queryStringParameters: Option[URLParams], body: String, headers: Option[Map[String, String]]) {
  def onlyCancelDirectDebit: Boolean = queryStringParameters.exists(_.onlyCancelDirectDebit)
  def requestAuth: Option[RequestAuth] =
    for {
      queryStringParameters <- queryStringParameters
      apiToken <- queryStringParameters.apiToken
    } yield RequestAuth(apiToken)
}

object URLParams {
  implicit val jf = (
    (JsPath \ "apiToken").readNullable[String] and
    (JsPath \ "onlyCancelDirectDebit").readNullable[String].map(_.contains("true")) and
    (JsPath \ "stripeAccount").readNullable[String].map(_.flatMap(StripeAccount.fromString))
  )(URLParams.apply _)
}

object ApiGatewayRequest {
  implicit val jf = Json.reads[ApiGatewayRequest]
}
