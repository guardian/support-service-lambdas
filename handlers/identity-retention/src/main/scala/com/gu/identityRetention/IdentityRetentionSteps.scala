package com.gu.identityRetention

import com.gu.identityRetention.Types.IdentityId
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.Operation
import com.gu.util.apigateway.{ApiGatewayRequest, ApiGatewayResponse, URLParams}
import com.gu.util.reader.Types.ApiGatewayOp
import ApiGatewayOp._
import com.gu.util.zuora.ZuoraQuery.ZuoraQuerier
import scala.util.{Try, Success, Failure}

object IdentityRetentionSteps extends Logging {

  def apply(zuoraQuerier: ZuoraQuerier): Operation = Operation.noHealthcheck({
    apiGatewayRequest: ApiGatewayRequest =>
      (for {
        identityId <- extractIdentityId(apiGatewayRequest.queryStringParameters)
        accounts <- HasActiveZuoraAccounts(identityId, zuoraQuerier)
        subs <- SubscriptionsForAccounts(zuoraQuerier)(accounts)
      } yield RelationshipForSubscriptions(subs)).apiResponse
  }, false)

  def extractIdentityId(queryStringParams: Option[URLParams]): ApiGatewayOp[IdentityId] = {
    val user = for {
      queryStrings <- queryStringParams
      inputId <- queryStrings.identityId
      identityId <- validate(inputId)
    } yield identityId
    user match {
      case Some(id) => ContinueProcessing(id)
      case None => ReturnWithResponse(ApiGatewayResponse.badRequest)
    }
  }

  def validate(input: String): Option[IdentityId] = {
    Try(input.toLong) match {
      case Success(validUserId) => Some(IdentityId(validUserId.toString))
      case Failure(ex) =>
        logger.error(s"Invalid identity id provided", ex)
        None
    }
  }

}
