package com.gu.newproduct.api.addsubscription.validation

import com.gu.newproduct.api.addsubscription.validation.Validation._
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.ApiGatewayOp
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError, NotFound}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class ValidationImplicitsTest extends AnyFlatSpec with Matchers {

  case class TestData(maybeValue: Option[String])

  case class ValidatedTestData(validatedValue: String)

  "andValidateWith" should "compose getter and validation into a single function" in {
    def getData(id: String): ClientFailableOp[TestData] = ClientSuccess(TestData(Some(s"data for id $id")))

    def validationFunc(testData: TestData): ValidationResult[ValidatedTestData] = testData.maybeValue match {
      case None => Failed("value is missing")
      case Some(value) => Passed(ValidatedTestData(value))
    }

    def getValidatedData: String => ApiGatewayOp[ValidatedTestData] = getData(_) andValidateWith validationFunc

    getValidatedData("testId") shouldBe ContinueProcessing(ValidatedTestData("data for id testId"))
  }

  it should "return 500 error if getter return generic error" in {
    def getData(id: String): ClientFailableOp[TestData] = GenericError("something failed!")

    def validationFunc(testData: TestData) = Passed(ValidatedTestData("some response"))

    def getValidatedData: String => ApiGatewayOp[ValidatedTestData] = getData(_) andValidateWith validationFunc

    getValidatedData("testId") shouldBe ReturnWithResponse(
      ApiGatewayResponse.internalServerError("ignored log message"),
    )
  }

  it should "return 500 error if getter returns not found and no custom not found mesage was specified" in {
    def getData(id: String): ClientFailableOp[TestData] = NotFound("test data not found")

    def validationFunc(testData: TestData) = Passed(ValidatedTestData("some response"))

    def getValidatedData: String => ApiGatewayOp[ValidatedTestData] = getData(_) andValidateWith validationFunc

    getValidatedData("testId") shouldBe ReturnWithResponse(
      ApiGatewayResponse.internalServerError("ignored log message"),
    )
  }

  it should "return 422 with custom message if getter returns not found and a custom error is specified" in {
    def getData(id: String): ClientFailableOp[TestData] = NotFound("test data not found")

    def validationFunc(testData: TestData) = Passed(ValidatedTestData("some response"))

    def getValidatedData: String => ApiGatewayOp[ValidatedTestData] = getData(_).andValidateWith(
      validate = validationFunc,
      ifNotFoundReturn = Some("invalid test data Id"),
    )

    getValidatedData("testId") shouldBe ReturnWithResponse(
      ApiGatewayResponse.messageResponse("422", "invalid test data Id"),
    )
  }

  it should "return 422 with validation error if validation fails" in {
    def getData(id: String): ClientFailableOp[TestData] = ClientSuccess(TestData(Some(s"data for id $id")))

    def validationFunc(testData: TestData) = Failed("validation failed!")

    def getValidatedData: String => ApiGatewayOp[ValidatedTestData] = getData(_) andValidateWith validationFunc

    getValidatedData("testId") shouldBe ReturnWithResponse(
      ApiGatewayResponse.messageResponse("422", "validation failed!"),
    )
  }

  case class Unvalidated(value: String)

  case class OnceValidated(value: String)

  case class TwiceValidated(value: String)

  "thenValidate" should "pass if both validations pass" in {
    def validationFunc1(data: Unvalidated) = Passed(OnceValidated(data.value))
    def validationFunc2(data: OnceValidated) = Passed(TwiceValidated(data.value))
    def validateTwice = validationFunc1 _ thenValidate validationFunc2 _

    validateTwice(Unvalidated("something")) shouldBe Passed(TwiceValidated("something"))
  }

  it should "fail if first validation fails" in {
    def validationFunc1(data: Unvalidated) = Failed("first validation error")
    def validationFunc2(data: OnceValidated) = Passed(TwiceValidated(data.value))
    def validateTwice = validationFunc1 _ thenValidate validationFunc2 _

    validateTwice(Unvalidated("something")) shouldBe Failed("first validation error")
  }

  it should "fail if second validation fails" in {
    def validationFunc1(data: Unvalidated) = Passed(OnceValidated(data.value))
    def validationFunc2(data: OnceValidated) = Failed("second validation error")
    def validateTwice = validationFunc1 _ thenValidate validationFunc2 _

    validateTwice(Unvalidated("something")) shouldBe Failed("second validation error")
  }
  it should "return first validation error if both fail" in {
    def validationFunc1(data: Unvalidated) = Failed("first validation error")
    def validationFunc2(data: OnceValidated) = Failed("second validation error")
    def validateTwice = validationFunc1 _ thenValidate validationFunc2 _

    validateTwice(Unvalidated("something")) shouldBe Failed("first validation error")
  }
}
