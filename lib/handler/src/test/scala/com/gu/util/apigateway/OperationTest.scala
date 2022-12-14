package com.gu.util.apigateway

import com.gu.util.apigateway.ApiGatewayHandler.Operation
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class OperationTest extends AnyFlatSpec with Matchers {

  it should "map the operation properly when it succeeds" in {

    val operation = Operation(_ => ApiGatewayResponse("200", "blah"), () => ApiGatewayResponse("0", "blah"))
    val newOperation = operation.prependRequestValidationToSteps(req => ContinueProcessing(()))
    val actual = newOperation.steps(ApiGatewayRequest(None, None, None, None, None, None))
    actual.statusCode should be("200")

  }

  it should "map the operation properly when it fails" in {

    val operation = Operation(_ => ApiGatewayResponse("200", "blah"), () => ApiGatewayResponse("0", "blah"))
    val newOperation =
      operation.prependRequestValidationToSteps(req => ReturnWithResponse(ApiGatewayResponse("401", "blah")))
    val actual = newOperation.steps(ApiGatewayRequest(None, None, None, None, None, None))
    actual.statusCode should be("401")

  }

}
