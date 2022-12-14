package com.gu.newproduct.api.addsubscription

import com.gu.newproduct.api.addsubscription.validation.{Failed, Passed}
import TypeConvert._
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import com.gu.util.resthttp.Types.{ClientSuccess, GenericError, NotFound}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers
class TypeConvertTest extends AnyFlatSpec with Matchers {

  def api422Response(message: String) = ReturnWithResponse(
    ApiGatewayResponse.messageResponse(statusCode = "422", message = message),
  )
  "ValidationToApiGatewayOp" should "convert failed validation to status 422 api response" in {
    val failure = Failed("validation error")
    ValidationToApiGatewayOp(failure).toApiGatewayOp shouldBe api422Response("validation error")
  }

  it should "convert passed validation to continue processing" in {
    val passedValidation = Passed("some value")
    ValidationToApiGatewayOp(passedValidation).toApiGatewayOp shouldBe ContinueProcessing("some value")
  }

  "toApiResponseCheckingNotFound" should "convert not found client error to status 422 api response" in {
    val notFound = NotFound("server specific error")

    val actual = ClientFailableOpToApiResponse(notFound).toApiResponseCheckingNotFound(
      action = "some action",
      ifNotFoundReturn = "validation message",
    )

    actual shouldBe api422Response("validation message")
  }

  it should "convert generic errors to 500 status response" in {
    val genericError = GenericError("fatal error")

    val actual = ClientFailableOpToApiResponse(genericError).toApiResponseCheckingNotFound(
      action = "some action",
      ifNotFoundReturn = "validation message",
    )

    actual shouldBe ReturnWithResponse(ApiGatewayResponse.internalServerError(error = "ignored log message"))
  }

  it should "convert client success to continue processing" in {
    val success = ClientSuccess("something")

    val actual = ClientFailableOpToApiResponse(success).toApiResponseCheckingNotFound(
      action = "some action",
      ifNotFoundReturn = "validation message",
    )

    actual shouldBe ContinueProcessing("something")
  }
}
