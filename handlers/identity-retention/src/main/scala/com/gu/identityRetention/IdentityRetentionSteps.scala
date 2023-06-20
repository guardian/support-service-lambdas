package com.gu.identityRetention

import com.gu.identityRetention.Types.IdentityId
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.Operation
import com.gu.util.apigateway.{ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.reader.Types.ApiGatewayOp
import ApiGatewayOp._
import com.gu.google.BigQueryHelper
import play.api.libs.json.Json
import com.gu.util.reader.Types._

import scala.util.{Failure, Success, Try}

object IdentityRetentionSteps extends Logging {

  case class UrlParams(identityId: String)
  object UrlParams {
    implicit val reads = Json.reads[UrlParams]
  }

  def apply(bigQueryHelper: BigQueryHelper): Operation =
    Operation.noHealthcheck({ apiGatewayRequest: ApiGatewayRequest =>
      (for {
        queryStringParameters <- apiGatewayRequest.queryParamsAsCaseClass[UrlParams]()
        identityId <- extractIdentityId(queryStringParameters)
        holdings <- GetActiveProductHoldings(bigQueryHelper)(identityId)
      } yield RelationshipForHoldings(holdings)).apiResponse
    })

  def extractIdentityId(queryStringParams: UrlParams): ApiGatewayOp[IdentityId] = {
    validate(queryStringParams.identityId) match {
      case Some(id) => ContinueProcessing(id)
      case None => ReturnWithResponse(ApiGatewayResponse.badRequest("no identity id"))
    }
  }

  def validate(input: String): Option[IdentityId] = {
    Try(input.toLong) match {
      case Success(validUserId) => Some(IdentityId(validUserId.toString))
      case Failure(ex) =>
        logger.error(s"Invalid identity id provided: $input")
        None
    }
  }

}
