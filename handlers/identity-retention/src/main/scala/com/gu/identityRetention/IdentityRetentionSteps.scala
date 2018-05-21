package com.gu.identityRetention

import com.gu.identityRetention.Types.IdentityId
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.Operation
import com.gu.util.apigateway.{ApiGatewayRequest, ApiGatewayResponse, URLParams}
import com.gu.util.reader.Types.FailableOp
import com.gu.util.zuora.ZuoraQuery.ZuoraQuerier
import scala.util.{Try, Success, Failure}
import scalaz.{-\/, \/-}

object IdentityRetentionSteps extends Logging {

  def apply(zuoraQuerier: ZuoraQuerier): Operation = Operation.noHealthcheck({
    apiGatewayRequest: ApiGatewayRequest =>
      for {
        identityId <- extractIdentityId(apiGatewayRequest.queryStringParameters)
        _ <- HasActiveZuoraAccounts(identityId, zuoraQuerier)
      } yield ()
  }, false)

  def extractIdentityId(queryStringParams: Option[URLParams]): FailableOp[IdentityId] = {
    val user = for {
      queryStrings <- queryStringParams
      inputId <- queryStrings.identityId
      identityId <- validate(inputId)
    } yield identityId
    user match {
      case Some(id) => \/-(id)
      case None => -\/(ApiGatewayResponse.badRequest)
    }
  }

  def validate(input: String): Option[IdentityId] = {
    Try(input.toLong) match {
      case Success(validUserId) => Some(IdentityId(validUserId))
      case Failure(ex) =>
        logger.error(s"Invalid identity id provided", ex)
        None
    }
  }

}
