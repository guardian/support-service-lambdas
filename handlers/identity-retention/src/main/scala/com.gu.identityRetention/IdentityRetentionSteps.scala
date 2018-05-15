package com.gu.identityRetention

import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.Operation
import com.gu.util.apigateway.ApiGatewayRequest
import com.gu.util.reader.Types._
import scala.util.Success

object IdentityRetentionSteps extends Logging {

  def apply: Operation = Operation.noHealthcheck(steps, false)

  def steps(apiGatewayRequest: ApiGatewayRequest): FailableOp[Unit] = {
    logger.info("Running fake identity retention steps")
    Success(()).toFailableOp("always succeeds")
  }

}
