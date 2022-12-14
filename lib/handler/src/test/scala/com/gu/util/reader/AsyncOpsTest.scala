package com.gu.util.reader

import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.AsyncTypes._
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import org.scalatest.flatspec.AsyncFlatSpec
import org.scalatest.matchers.should.Matchers

class AsyncOpsTest extends AsyncFlatSpec with Matchers {

  "recoverAndLog" should "replace any async returnWithResponse with continueProcessing" in {
    val asyncReturn: AsyncApiGatewayOp[Unit] =
      ReturnWithResponse(ApiGatewayResponse.internalServerError("some error")).toAsync
    asyncReturn.recoverAndLog("action description").underlying.map { result =>
      result shouldBe ContinueProcessing(())
    }
  }

  it should "not modify the response if it is already continueProcessing" in {
    val asyncContinue = ContinueProcessing(()).toAsync
    asyncContinue.recoverAndLog("action description").underlying.map { result =>
      result shouldBe ContinueProcessing(())
    }
  }

}
