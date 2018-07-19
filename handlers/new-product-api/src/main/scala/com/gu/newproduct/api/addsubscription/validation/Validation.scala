package com.gu.newproduct.api.addsubscription.validation

import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.ApiGatewayOp
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}

object Validation {
  def errorResponse(msg: String) = ReturnWithResponse(ApiGatewayResponse.messageResponse("422", msg))

  implicit class BooleanValidation(isValid: Boolean) {
    def ifFalseReturn(errorMessage: String): ApiGatewayOp[Unit] =
      if (isValid) ContinueProcessing(()) else errorResponse(errorMessage)
  }

  implicit class OptionValidation[A](option: Option[A]) {
    def getOrReturn(errorMsg: String): ApiGatewayOp[A] = option match {
      case Some(value) => ContinueProcessing(value)
      case None => errorResponse(errorMsg)
    }
  }
}
