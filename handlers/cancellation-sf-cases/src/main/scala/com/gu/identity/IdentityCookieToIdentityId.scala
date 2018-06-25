package com.gu.identity

import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.ApiGatewayOp
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}

object IdentityCookieToIdentityId extends Logging {

  lazy val unauthorized = ReturnWithResponse(ApiGatewayResponse.unauthorized)

  def apply(headersOption: Option[Map[String, String]]): ApiGatewayOp[String] = headersOption match {
    case Some(headers) => processHeaders(headers)
    case None => {
      logger.debug("no headers")
      unauthorized
    }
  }

  def processHeaders(headers: Map[String, String]): ApiGatewayOp[String] = headers get "Cookie" match {
    case Some(cookie) => processCookie(cookie)
    case None => {
      logger.debug("no cookie")
      unauthorized
    }
  }

  def processCookie(cookie: String): ApiGatewayOp[String] = ContinueProcessing("100496341")

}
