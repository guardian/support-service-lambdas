package com.gu.identityRetention

import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.Operation
import com.gu.util.apigateway.{ApiGatewayRequest, ApiGatewayResponse, URLParams}
import com.gu.util.reader.Types.FailableOp
import com.gu.util.zuora.ZuoraQuery.ZuoraQuerier
import scalaz.{-\/, \/-}

object IdentityRetentionSteps extends Logging {

  def apply(zuoraQuerier: ZuoraQuerier): Operation = Operation.noHealthcheck({
    apiGatewayRequest: ApiGatewayRequest =>
      extractIdentityId(apiGatewayRequest.queryStringParameters)
      ActiveZuoraCheck.apply("123", zuoraQuerier)
  }, false)

  def extractIdentityId(queryStringParams: Option[URLParams]): FailableOp[String] = {
    val identityId = for {
      queryStrings <- queryStringParams
      id <- queryStrings.identityId
    } yield id
    identityId match {
      case Some(user) => \/-(user)
      case None => -\/(ApiGatewayResponse.badRequest)
    }
  }

}
