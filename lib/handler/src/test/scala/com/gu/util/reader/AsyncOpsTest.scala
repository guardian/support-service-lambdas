package com.gu.util.reader

import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.AsyncTypes._
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import org.scalatest.{AsyncFlatSpec, Matchers}

class AsyncOpsTest extends AsyncFlatSpec with Matchers {

  "logAndContinue" should "replace any async returnWithResponse with continueProcessing" in {
    val asyncReturn: AsyncApiGatewayOp[Unit] = ReturnWithResponse(ApiGatewayResponse.internalServerError("some error")).toAsync
    asyncReturn.logAndContinue("action description").underlying.map {
      result => result shouldBe ContinueProcessing(())
    }
  }

  it should "not modify the response if it is already continueProcessing" in {
    val asyncContinue = ContinueProcessing(()).toAsync
    asyncContinue.logAndContinue("action description").underlying.map {
      result => result shouldBe ContinueProcessing(())
    }
  }

}
