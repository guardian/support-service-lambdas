package com.gu.digital_voucher_api

import java.time.LocalDate

import cats.data.EitherT
import cats.effect.IO
import com.gu.imovo.SfSubscriptionId
import org.http4s.Method.PUT
import org.http4s.Request
import org.http4s.implicits.{http4sKleisliResponseSyntaxOptionT, http4sLiteralsSyntax}
import org.scalamock.scalatest.MockFactory
import org.scalatest.OneInstancePerTest
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class DigitalVoucherApiRoutesTest extends AnyFlatSpec with Matchers with MockFactory with OneInstancePerTest {

  private val sfSubId = "xae45thglojjfe3"
  private val startDate = "2020-09-18"
  private val endDateExclusive = "2020-09-19"

  private val mockService = mock[DigitalVoucherService[IO]]
  private val routes = DigitalVoucherApiRoutes(mockService)

  private def requestWithBody(body: String) = Request[IO](
    method = PUT,
    uri = uri"/digital-voucher/suspend",
  ).withEntity(body)

  "Put /digital-voucher/suspend" should "return HTTP 200 if suspend succeeds" in {
    val request = requestWithBody(
      s"""{"subscriptionId": "$sfSubId", "startDate": "$startDate", "endDateExclusive": "$endDateExclusive"}""",
    )

    val response = routes.orNotFound.run(request)

    (mockService.suspendVoucher _)
      .expects(SfSubscriptionId(sfSubId), LocalDate.parse(startDate), LocalDate.parse(endDateExclusive))
      .returns(EitherT[IO, DigitalVoucherServiceError, Unit](IO(Right(()))))

    response.unsafeRunSync().status.code shouldBe 200
  }

  it should "return HTTP 400 if request invalid" in {
    val request = requestWithBody(s"""{""")
    val response = routes.orNotFound.run(request)
    response.unsafeRunSync().status.code shouldBe 400
  }

  it should "return HTTP 422 if subscription ID missing" in {
    val request = requestWithBody(s"""{}""")
    val response = routes.orNotFound.run(request)
    response.unsafeRunSync().status.code shouldBe 422
  }

  it should "return HTTP 422 if start date missing" in {
    val request = requestWithBody(s"""{"subscriptionId": "$sfSubId"}""")
    val response = routes.orNotFound.run(request)
    response.unsafeRunSync().status.code shouldBe 422
  }

  it should "return HTTP 422 if end date missing" in {
    val request = requestWithBody(s"""{"subscriptionId": "$sfSubId", "startDate": "$startDate"}""")
    val response = routes.orNotFound.run(request)
    response.unsafeRunSync().status.code shouldBe 422
  }

  it should "return HTTP 500 if suspend fails" in {
    val request = requestWithBody(
      s"""{"subscriptionId": "$sfSubId", "startDate": "$startDate", "endDateExclusive": "$endDateExclusive"}""",
    )

    val response = routes.orNotFound.run(request)

    (mockService.suspendVoucher _)
      .expects(SfSubscriptionId(sfSubId), LocalDate.parse(startDate), LocalDate.parse(endDateExclusive))
      .returns(EitherT[IO, DigitalVoucherServiceError, Unit](IO(Left(DigitalVoucherServiceFailure("failed")))))

    response.unsafeRunSync().status.code shouldBe 500
  }

  it should "return HTTP 502 if suspend fails because of upstream service failure" in {
    val request = requestWithBody(
      s"""{"subscriptionId": "$sfSubId", "startDate": "$startDate", "endDateExclusive": "$endDateExclusive"}""",
    )

    val response = routes.orNotFound.run(request)

    (mockService.suspendVoucher _)
      .expects(SfSubscriptionId(sfSubId), LocalDate.parse(startDate), LocalDate.parse(endDateExclusive))
      .returns(EitherT[IO, DigitalVoucherServiceError, Unit](IO(Left(ImovoOperationFailedException("failed")))))

    response.unsafeRunSync().status.code shouldBe 502
  }
}
