package com.gu.digital_voucher_api

import java.time.LocalDate

import cats.effect.IO
import com.gu.DevIdentity
import com.gu.digital_voucher_api.imovo.ImovoStub._
import com.gu.digital_voucher_api.imovo.{ImovoErrorResponse, ImovoSubscriptionResponse, ImovoSubscriptionType, ImovoSuccessResponse, ImovoUpdateResponse, ImovoVoucher, ImovoVoucherResponse}
import com.softwaremill.diffx.scalatest.DiffMatcher
import com.softwaremill.sttp.impl.cats.CatsMonadError
import com.softwaremill.sttp.testing.SttpBackendStub
import io.circe.Decoder
import io.circe.generic.auto._
import io.circe.parser.decode
import io.circe.syntax._
import org.http4s.{Method, Request, Response, Uri}
import org.scalatest.EitherValues
import org.scalatest.Inside.inside
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should

class DigitalVoucherApiTest extends AnyFlatSpec with should.Matchers with DiffMatcher with EitherValues {

  private val apiKey = "imovo-test-api-key"
  private val baseUrl = "https://imovo.test.com"
  private val subscriptionId = SfSubscriptionId("123456")
  private val tomorrow = LocalDate.now.plusDays(1).toString

  "DigitalVoucherApi" should "return stubbed voucher details for old create request" in {
    val imovoBackendStub: SttpBackendStub[IO, Nothing] = SttpBackendStub[IO, Nothing](new CatsMonadError[IO])
      .stubCreate(
        apiKey = apiKey,
        baseUrl = baseUrl,
        customerRef = subscriptionId.value,
        campaignCode = "GMGSub7DayCard",
        startDate = tomorrow,
        response = ImovoVoucherResponse("new-card-code", successfulRequest = true)
      )
      .stubCreate(
        apiKey = apiKey,
        baseUrl = baseUrl,
        customerRef = subscriptionId.value,
        campaignCode = "GMGSub7DayHNDSS",
        startDate = tomorrow,
        response = ImovoVoucherResponse("new-letter-code", successfulRequest = true)
      )

    val app = createApp(imovoBackendStub)
    val response = app.run(
      Request(
        method = Method.PUT,
        uri = Uri(path = s"/digital-voucher/create/${subscriptionId.value}")
      ).withEntity[String](CreateVoucherRequestBody("Everyday").asJson.spaces2)
    ).value.unsafeRunSync().get

    response.status.code should matchTo(201)
    getBody[Voucher](response) should matchTo(Voucher("new-card-code", "new-letter-code"))
  }

  it should "return voucher details for create subscription request" in {
    val imovoBackendStub: SttpBackendStub[IO, Nothing] = SttpBackendStub[IO, Nothing](new CatsMonadError[IO])
      .stubCreateSubscription(
        apiKey = apiKey,
        baseUrl = baseUrl,
        subscriptionId = subscriptionId.value,
        schemeName = "Guardian7Day",
        startDate = tomorrow,
        response = ImovoSubscriptionResponse(
          schemeName = "Guardian7Day",
          subscriptionId = subscriptionId.value,
          successfulRequest = true,
          subscriptionVouchers = List(
            ImovoVoucher("ActiveCard", "new-card-code"),
            ImovoVoucher("ActiveLetter", "new-letter-code")
          )
        )
      )

    val app = createApp(imovoBackendStub)
    val response = app.run(
      Request(
        method = Method.PUT,
        uri = Uri(path = s"/digital-voucher/${subscriptionId.value}")
      ).withEntity[String](CreateVoucherRequestBody("Everyday").asJson.spaces2)
    ).value.unsafeRunSync().get

    response.status.code should matchTo(201)
    getBody[Voucher](response) should matchTo(Voucher("new-card-code", "new-letter-code"))
  }
  it should "get existing voucher details from imovo if create fails because the vouchers already exist" in {
    val imovoBackendStub: SttpBackendStub[IO, Nothing] = SttpBackendStub[IO, Nothing](new CatsMonadError[IO])
      .stubCreateSubscription(
        apiKey = apiKey,
        baseUrl = baseUrl,
        subscriptionId = subscriptionId.value,
        schemeName = "Guardian7Day",
        startDate = tomorrow,
        response = ImovoErrorResponse(
          List("Unable to create vouchers: live subscription vouchers already exist for the supplied subscription ID"),
          successfulRequest = false
        )
      )
      .stubGetSubscription(
        apiKey = apiKey,
        baseUrl = baseUrl,
        subscriptionId = subscriptionId.value,
        response = ImovoSubscriptionResponse(
          schemeName = "Guardian7Day",
          subscriptionId = subscriptionId.value,
          successfulRequest = true,
          subscriptionVouchers = List(
            ImovoVoucher("ActiveCard", "existing-card-code"),
            ImovoVoucher("ActiveLetter", "existing-letter-code")
          )
        )
      )

    val app = createApp(imovoBackendStub)
    val response = app.run(
      Request(
        method = Method.PUT,
        uri = Uri(path = s"/digital-voucher/${subscriptionId.value}")
      ).withEntity[String](CreateVoucherRequestBody("Everyday").asJson.spaces2)
    ).value.unsafeRunSync().get

    response.status.code should matchTo(201)
    getBody[Voucher](response) should matchTo(Voucher("existing-card-code", "existing-letter-code"))
  }

  it should "return a 502 when both create subscription and get subscriptions requests to imovo fail" in {
    val imovoBackendStub: SttpBackendStub[IO, Nothing] = SttpBackendStub[IO, Nothing](new CatsMonadError[IO])
      .stubCreateSubscription(
        apiKey = apiKey,
        baseUrl = baseUrl,
        subscriptionId = subscriptionId.value,
        schemeName = "Guardian7Day",
        startDate = tomorrow,
        response = ImovoErrorResponse(List("imovo-error-1"), successfulRequest = false)
      )
      .stubGetSubscription(
        apiKey = apiKey,
        baseUrl = baseUrl,
        subscriptionId = subscriptionId.value,
        response = ImovoErrorResponse(List("imovo-error-2"), successfulRequest = false)
      )
    val app = createApp(imovoBackendStub)
    val response = app.run(
      Request(
        method = Method.PUT,
        uri = Uri(path = s"/digital-voucher/${subscriptionId.value}")
      ).withEntity[String](CreateVoucherRequestBody("Everyday").asJson.spaces2)
    ).value.unsafeRunSync().get

    response.status.code should matchTo(502)
    getBody[DigitalVoucherApiRoutesError](response) should matchTo(DigitalVoucherApiRoutesError(
      s"""Imovo failure to create voucher: Imovo create request failed:Request GET $baseUrl/Subscription/RequestSubscriptionVouchers?SubscriptionId=123456&SchemeName=Guardian7Day&StartDate=$tomorrow failed with response ({
         |  "errorMessages" : [
         |    "imovo-error-1"
         |  ],
         |  "successfulRequest" : false
         |}) and the Imovo get request failed: Request GET $baseUrl/Subscription/GetSubscriptionVoucherDetails?SubscriptionId=123456 failed with response ({
         |  "errorMessages" : [
         |    "imovo-error-2"
         |  ],
         |  "successfulRequest" : false
         |})""".stripMargin
    ))
  }

  it should "return a 422 when ratePlanName in create subscription request param doesn't have a scheme name" in {
    val imovoBackendStub: SttpBackendStub[IO, Nothing] = SttpBackendStub[IO, Nothing](new CatsMonadError[IO])

    val app = createApp(imovoBackendStub)
    val response = app.run(
      Request(
        method = Method.PUT,
        uri = Uri(path = s"/digital-voucher/${subscriptionId.value}")
      ).withEntity[String](CreateVoucherRequestBody("HomeDelivery").asJson.spaces2)
    ).value.unsafeRunSync().get

    response.status.code should matchTo(422)
    getBody[DigitalVoucherApiRoutesError](response) should matchTo(DigitalVoucherApiRoutesError(
      "Bad request argument: Rate plan name has no matching scheme name: RatePlanName(HomeDelivery)"
    ))
  }

  it should "return a 502 when any call to Imovo fails" in {
    val imovoBackendStub: SttpBackendStub[IO, Nothing] = SttpBackendStub[IO, Nothing](new CatsMonadError[IO])
      .stubCreate(
        apiKey = apiKey,
        baseUrl = baseUrl,
        customerRef = subscriptionId.value,
        campaignCode = "GMGSub7DayCard",
        startDate = tomorrow,
        response = ImovoErrorResponse(List("imovo-error"), successfulRequest = false)
      )
      .stubCreate(
        apiKey = apiKey,
        baseUrl = baseUrl,
        customerRef = subscriptionId.value,
        campaignCode = "GMGSub7DayHNDSS",
        startDate = tomorrow,
        response = ImovoVoucherResponse("new-letter-code", successfulRequest = true)
      )

    val app = createApp(imovoBackendStub)
    val response = app.run(
      Request(
        method = Method.PUT,
        uri = Uri(path = s"/digital-voucher/create/${subscriptionId.value}")
      ).withEntity[String](CreateVoucherRequestBody("Everyday").asJson.spaces2)
    ).value.unsafeRunSync().get

    response.status.code should matchTo(502)
    getBody[DigitalVoucherApiRoutesError](response) should matchTo(DigitalVoucherApiRoutesError(
      s"""Imovo failure to create voucher: Request GET $baseUrl//VoucherRequest/Request?customerReference=123456&campaignCode=GMGSub7DayCard&StartDate=$tomorrow failed with response ({
        |  "errorMessages" : [
        |    "imovo-error"
        |  ],
        |  "successfulRequest" : false
        |})""".stripMargin
    ))
  }

  it should "return a 502 when multiple calls to Imovo fail" in {
    val imovoBackendStub: SttpBackendStub[IO, Nothing] = SttpBackendStub[IO, Nothing](new CatsMonadError[IO])
      .stubCreate(
        apiKey = apiKey,
        baseUrl = baseUrl,
        customerRef = subscriptionId.value,
        campaignCode = "GMGSub7DayCard",
        startDate = tomorrow,
        response = ImovoErrorResponse(List("imovo-error-1"), successfulRequest = false)
      )
      .stubCreate(
        apiKey = apiKey,
        baseUrl = baseUrl,
        customerRef = subscriptionId.value,
        campaignCode = "GMGSub7DayHNDSS",
        startDate = tomorrow,
        response = ImovoErrorResponse(List("imovo-error-2"), successfulRequest = false)
      )

    val app = createApp(imovoBackendStub)
    val response = app.run(
      Request(
        method = Method.PUT,
        uri = Uri(path = s"/digital-voucher/create/${subscriptionId.value}")
      ).withEntity[String](CreateVoucherRequestBody("Everyday").asJson.spaces2)
    ).value.unsafeRunSync().get

    response.status.code should matchTo(502)
    getBody[DigitalVoucherApiRoutesError](response) should matchTo(DigitalVoucherApiRoutesError(
      s"""Imovo failure to create voucher: Request GET $baseUrl//VoucherRequest/Request?customerReference=123456&campaignCode=GMGSub7DayCard&StartDate=$tomorrow failed with response ({
        |  "errorMessages" : [
        |    "imovo-error-1"
        |  ],
        |  "successfulRequest" : false
        |}), Request GET $baseUrl//VoucherRequest/Request?customerReference=123456&campaignCode=GMGSub7DayHNDSS&StartDate=$tomorrow failed with response ({
        |  "errorMessages" : [
        |    "imovo-error-2"
        |  ],
        |  "successfulRequest" : false
        |})""".stripMargin
    ))
  }

  it should "return a 422 when ratePlanName param doesn't match an Imovo campaign" in {
    val imovoBackendStub: SttpBackendStub[IO, Nothing] = SttpBackendStub[IO, Nothing](new CatsMonadError[IO])

    val app = createApp(imovoBackendStub)
    val response = app.run(
      Request(
        method = Method.PUT,
        uri = Uri(path = s"/digital-voucher/create/${subscriptionId.value}")
      ).withEntity[String](CreateVoucherRequestBody("HomeDelivery").asJson.spaces2)
    ).value.unsafeRunSync().get

    response.status.code should matchTo(422)
    getBody[DigitalVoucherApiRoutesError](response) should matchTo(DigitalVoucherApiRoutesError(
      "Bad request argument: Rate plan name has no matching campaign codes: RatePlanName(HomeDelivery)"
    ))
  }

  it should "return voucher details for replace request with original voucher codes" in {
    val imovoBackendStub: SttpBackendStub[IO, Nothing] = SttpBackendStub[IO, Nothing](new CatsMonadError[IO])
      .stubReplace(
        apiKey = apiKey,
        baseUrl = baseUrl,
        voucherCode = "card-test-voucher-code",
        response = ImovoVoucherResponse("replaced-card-test-voucher-code", true)
      )
      .stubReplace(
        apiKey = apiKey,
        baseUrl = baseUrl,
        voucherCode = "letter-test-voucher-code",
        response = ImovoVoucherResponse("replaced-letter-test-voucher-code", true)
      )

    val app = createApp(imovoBackendStub)
    val response = app.run(
      Request(
        method = Method.POST,
        Uri(path = "/digital-voucher/replace")
      ).withEntity[String](Voucher("card-test-voucher-code", "letter-test-voucher-code").asJson.spaces2)
    ).value.unsafeRunSync().get

    getBody[Voucher](response) should matchTo(
      Voucher("replaced-card-test-voucher-code", "replaced-letter-test-voucher-code")
    )
    response.status.code should matchTo(200)
  }

  it should "return voucher details for replace request with subscriptionId" in {
    val imovoBackendStub: SttpBackendStub[IO, Nothing] = SttpBackendStub[IO, Nothing](new CatsMonadError[IO])
      .stubReplaceSubscription(
        apiKey = apiKey,
        baseUrl = baseUrl,
        subscriptionId = subscriptionId.value,
        imovoSubscriptionType = ImovoSubscriptionType.Both,
        response = ImovoSubscriptionResponse(
          schemeName = "Guardian7Day",
          subscriptionId = subscriptionId.value,
          successfulRequest = true,
          subscriptionVouchers = List(
            ImovoVoucher("ActiveCard", "replaced-card-test-voucher-code"),
            ImovoVoucher("ActiveLetter", "replaced-letter-test-voucher-code")
          )
        )
      )

    val app = createApp(imovoBackendStub)
    val response = app.run(
      Request(
        method = Method.POST,
        Uri(path = "/digital-voucher/replace")
      ).withEntity[String](SubscriptionActionRequestBody(Some(subscriptionId.value), None, None).asJson.spaces2)
    ).value.unsafeRunSync().get

    getBody[Voucher](response) should matchTo(
      Voucher("replaced-card-test-voucher-code", "replaced-letter-test-voucher-code")
    )
    response.status.code should matchTo(200)
  }

  it should "return error response when one imovo replace request fails" in {
    val imovoBackendStub: SttpBackendStub[IO, Nothing] = SttpBackendStub[IO, Nothing](new CatsMonadError[IO])
      .stubReplace(
        apiKey = apiKey,
        baseUrl = baseUrl,
        voucherCode = "card-test-voucher-code",
        response = ImovoErrorResponse(Nil, false)
      )
      .stubReplace(
        apiKey = apiKey,
        baseUrl = baseUrl,
        voucherCode = "letter-test-voucher-code",
        response = ImovoVoucherResponse("replaced-letter-test-voucher-code", true)
      )

    val app = createApp(imovoBackendStub)
    val response = app.run(
      Request(
        method = Method.POST,
        Uri(path = "/digital-voucher/replace")
      ).withEntity[String](Voucher("card-test-voucher-code", "letter-test-voucher-code").asJson.spaces2)
    ).value.unsafeRunSync().get

    response.status.code should matchTo(500)
  }

  it should "return voucher details for get subscription request" in {
    val imovoBackendStub: SttpBackendStub[IO, Nothing] = SttpBackendStub[IO, Nothing](new CatsMonadError[IO])
      .stubGetSubscription(
        apiKey = apiKey,
        baseUrl = baseUrl,
        subscriptionId = subscriptionId.value,
        response = ImovoSubscriptionResponse(
          schemeName = "Guardian7Day",
          subscriptionId = subscriptionId.value,
          successfulRequest = true,
          subscriptionVouchers = List(
            ImovoVoucher("ActiveCard", "card-code"),
            ImovoVoucher("ActiveLetter", "letter-code")
          )
        )
      )

    val app = createApp(imovoBackendStub)
    val response = app.run(
      Request(
        method = Method.GET,
        Uri(path = s"/digital-voucher/${subscriptionId.value}")
      )
    ).value.unsafeRunSync().get

    getBody[Voucher](response) should matchTo(Voucher("card-code", "letter-code"))
    response.status.code should matchTo(200)
  }
  it should "return 200 response for cancel request" in {
    val cancellationDate = LocalDate.now().plusWeeks(1)

    val imovoBackendStub: SttpBackendStub[IO, Nothing] = SttpBackendStub[IO, Nothing](new CatsMonadError[IO])
      .stubSubscriptionCancel(
        apiKey = "imovo-test-api-key",
        baseUrl = "https://imovo.test.com",
        subscriptionId = subscriptionId.value,
        lastActiveDate = Some(cancellationDate.minusDays(1)),
        response = ImovoSuccessResponse("OK", true)
      )

    val app = createApp(imovoBackendStub)
    val response = app.run(
      Request(
        method = Method.POST,
        Uri(path = "/digital-voucher/cancel")
      ).withEntity[String](CancelSubscriptionVoucherRequestBody(subscriptionId.value, cancellationDate).asJson.spaces2)
    ).value.unsafeRunSync().get

    getBody[Unit](response) should equal(())

    response.status.code should equal(200)
  }

  private def createApp(backendStub: SttpBackendStub[IO, Nothing]) = {
    inside(DigitalVoucherApiApp(DevIdentity("digital-voucher-api"), backendStub).value.unsafeRunSync()) {
      case Right(value) => value
    }
  }

  private def getBody[A: Decoder](response: Response[IO]) = {
    val bodyString = response
      .bodyAsText()
      .compile
      .toList
      .unsafeRunSync()
      .mkString("")

    decode[A](bodyString)
      .fold(
        error => fail(s"Failed to decode response body $bodyString: $error"),
        identity
      )
  }
}
