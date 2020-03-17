package com.gu.digital_voucher_api

import java.time.LocalDate

import cats.effect.IO
import com.gu.DevIdentity
import com.gu.digital_voucher_api.imovo.ImovoStub._
import com.gu.digital_voucher_api.imovo.{ImovoErrorResponse, ImovoSubscriptionResponse, ImovoSubscriptionType, ImovoSuccessResponse, ImovoVoucherResponse}
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

  "DigitalVoucherApi" should "return voucher details for create subscription request" in {
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
            ImovoVoucherResponse("ActiveCard", "new-card-code"),
            ImovoVoucherResponse("ActiveLetter", "new-letter-code")
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
    getBody[SubscriptionVouchers](response) should matchTo(SubscriptionVouchers("new-card-code", "new-letter-code"))
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
            ImovoVoucherResponse("ActiveCard", "existing-card-code"),
            ImovoVoucherResponse("ActiveLetter", "existing-letter-code")
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
    getBody[SubscriptionVouchers](response) should matchTo(SubscriptionVouchers("existing-card-code", "existing-letter-code"))
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
            ImovoVoucherResponse("ActiveCard", "replaced-card-test-voucher-code"),
            ImovoVoucherResponse("ActiveLetter", "replaced-letter-test-voucher-code")
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

    getBody[SubscriptionVouchers](response) should matchTo(
      SubscriptionVouchers("replaced-card-test-voucher-code", "replaced-letter-test-voucher-code")
    )
    response.status.code should matchTo(200)
  }

  it should "return error response when one imovo replace request fails" in {
    val imovoBackendStub: SttpBackendStub[IO, Nothing] = SttpBackendStub[IO, Nothing](new CatsMonadError[IO])
      .stubReplaceSubscription(
        apiKey = apiKey,
        baseUrl = baseUrl,
        subscriptionId = subscriptionId.value,
        imovoSubscriptionType = ImovoSubscriptionType.Both,
        response = ImovoErrorResponse(Nil, false)
      )

    val app = createApp(imovoBackendStub)
    val response = app.run(
      Request(
        method = Method.POST,
        Uri(path = "/digital-voucher/replace")
      ).withEntity[String](SubscriptionActionRequestBody(Some(subscriptionId.value), None, None).asJson.spaces2)
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
            ImovoVoucherResponse("ActiveCard", "card-code"),
            ImovoVoucherResponse("ActiveLetter", "letter-code")
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

    getBody[SubscriptionVouchers](response) should matchTo(SubscriptionVouchers("card-code", "letter-code"))
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
