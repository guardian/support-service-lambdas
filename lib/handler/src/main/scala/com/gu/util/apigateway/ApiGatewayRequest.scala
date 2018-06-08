package com.gu.util.apigateway

import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.reader.Types._
import ApiGatewayOp._
import play.api.libs.functional.syntax._
import play.api.libs.json._

import scala.util.{Failure, Success, Try}

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
case class URLParams(
  apiToken: Option[String],
  onlyCancelDirectDebit: Boolean,
  stripeAccount: Option[StripeAccount],
  isHealthcheck: Boolean,
  noActivation: Boolean,
  identityId: Option[String]
)

/* Using query strings because for Basic Auth to work Zuora requires us to return a WWW-Authenticate
  header, and API Gateway does not support this header (returns x-amzn-Remapped-WWW-Authenticate instead)
  */
case class ApiGatewayRequest(queryStringParameters: Option[URLParams], body: Option[String], headers: Option[Map[String, String]]) {

  def onlyCancelDirectDebit: Boolean = queryStringParameters.exists(_.onlyCancelDirectDebit)
  def requestAuth: Option[RequestAuth] =
    for {
      queryStringParameters <- queryStringParameters
      apiToken <- queryStringParameters.apiToken
    } yield RequestAuth(apiToken)

  def bodyAsCaseClass[A](failureResponse: ApiResponse = ApiGatewayResponse.badRequest)(implicit reads: Reads[A]): ApiGatewayOp[A] = {
    body match {
      case Some(requestBody) =>
        Try(Json.parse(requestBody)) match {
          case Success(js) =>
            Json.fromJson[A](js).toApiGatewayOp(failureResponse)
          case Failure(ex) =>
            logger.warn(s"Tried to parse JSON but it was invalid")
            ReturnWithResponse(failureResponse)
        }
      case None =>
        logger.warn(s"Attempted to access response body but there was none")
        None.toApiGatewayContinueProcessing(ApiGatewayResponse.internalServerError("attempted to parse body when handling a GET request"))
    }
  }

}

object URLParams {
  implicit val jf = ( //FIXME should be parameterised
    (JsPath \ "apiToken").readNullable[String] and
    (JsPath \ "onlyCancelDirectDebit").readNullable[String].map(_.contains("true")) and
    (JsPath \ "stripeAccount").readNullable[String].map(_.flatMap(StripeAccount.fromString)) and
    (JsPath \ "isHealthcheck").readNullable[String].map(_.contains("true")) and
    (JsPath \ "noActivation").readNullable[String].map(_.contains("true")) and
    (JsPath \ "identityId").readNullable[String]
  )(URLParams.apply _)
}

object ApiGatewayRequest {
  implicit val jf = Json.reads[ApiGatewayRequest]
}
