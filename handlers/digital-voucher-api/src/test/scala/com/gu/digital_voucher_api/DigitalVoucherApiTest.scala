package com.gu.digital_voucher_api

import cats.effect.IO
import com.gu.DevIdentity
import com.gu.imovo.ImovoStub._
import com.gu.imovo._
import com.softwaremill.diffx.generic.auto._
import com.softwaremill.diffx.scalatest.DiffMatcher
import io.circe.Decoder
import io.circe.generic.auto._
import io.circe.parser.decode
import io.circe.syntax._
import org.http4s.{Method, Request, Response, Uri}
import org.scalatest.EitherValues
import org.scalatest.Inside.inside
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should
import sttp.client3.impl.cats.CatsMonadAsyncError
import sttp.client3.testing.SttpBackendStub

import java.time.LocalDate
import scala.concurrent.ExecutionContext
import org.http4s.syntax.literals._

class DigitalVoucherApiTest extends AnyFlatSpec with should.Matchers with DiffMatcher with EitherValues {

  private implicit val contextShift = IO.contextShift(ExecutionContext.global)

  private val imovoConfig = ImovoConfig("https://imovo.test.com", "imovo-test-api-key")
  private val subscriptionId = SfSubscriptionId("123456")
  private val tomorrow = LocalDate.now.plusDays(1).toString

  "DigitalVoucherApi" should "return voucher details for create subscription request" in {
    val imovoBackendStub: SttpBackendStub[IO, Nothing] =
      SttpBackendStub[IO, Nothing](new CatsMonadAsyncError[IO])
        .stubCreateSubscription(
          imovoConfig,
          subscriptionId = subscriptionId.value,
          schemeName = "Guardian7Day",
          startDate = tomorrow,
          response = ImovoSubscriptionResponse(
            schemeName = "Guardian7Day",
            subscriptionId = subscriptionId.value,
            successfulRequest = true,
            subscriptionVouchers = List(
              ImovoVoucherResponse("ActiveCard", "new-card-code"),
              ImovoVoucherResponse("ActiveLetter", "new-letter-code"),
            ),
          ),
        )

    val app = createApp(imovoBackendStub)
    val response = app
      .run(
        Request[IO](
          method = Method.PUT,
          uri = Uri(path = s"/digital-voucher/${subscriptionId.value}"),
        ).withEntity[String](CreateVoucherRequestBody("Everyday").asJson.spaces2),
      )
      .value
      .unsafeRunSync()
      .get

    response.status.code should matchTo(201)
    getBody[SubscriptionVouchers](response) should matchTo(SubscriptionVouchers("new-card-code", "new-letter-code"))
  }

  it should "get existing voucher details from imovo if create fails because the vouchers already exist" in {
    val imovoBackendStub: SttpBackendStub[IO, Nothing] =
      SttpBackendStub[IO, Nothing](new CatsMonadAsyncError[IO])
        .stubCreateSubscription(
          imovoConfig,
          subscriptionId = subscriptionId.value,
          schemeName = "Guardian7Day",
          startDate = tomorrow,
          response = ImovoErrorResponse(
            List(
              "Unable to create vouchers: live subscription vouchers already exist for the supplied subscription ID",
            ),
            successfulRequest = false,
          ),
        )
        .stubGetSubscription(
          imovoConfig,
          subscriptionId = subscriptionId.value,
          response = ImovoSubscriptionResponse(
            schemeName = "Guardian7Day",
            subscriptionId = subscriptionId.value,
            successfulRequest = true,
            subscriptionVouchers = List(
              ImovoVoucherResponse("ActiveCard", "existing-card-code"),
              ImovoVoucherResponse("ActiveLetter", "existing-letter-code"),
            ),
          ),
        )

    val app = createApp(imovoBackendStub)
    val response = app
      .run(
        Request[IO](
          method = Method.PUT,
          uri = Uri(path = s"/digital-voucher/${subscriptionId.value}"),
        ).withEntity[String](CreateVoucherRequestBody("Everyday").asJson.spaces2),
      )
      .value
      .unsafeRunSync()
      .get

    response.status.code should matchTo(201)
    getBody[SubscriptionVouchers](response) should matchTo(
      SubscriptionVouchers("existing-card-code", "existing-letter-code"),
    )
  }

  it should "return a 502 when both create subscription and get subscriptions requests to imovo fail" in {
    val imovoBackendStub: SttpBackendStub[IO, Nothing] =
      SttpBackendStub[IO, Nothing](new CatsMonadAsyncError[IO])
        .stubCreateSubscription(
          imovoConfig,
          subscriptionId = subscriptionId.value,
          schemeName = "Guardian7Day",
          startDate = tomorrow,
          response = ImovoErrorResponse(List("imovo-error-1"), successfulRequest = false),
        )
        .stubGetSubscription(
          imovoConfig,
          subscriptionId = subscriptionId.value,
          response = ImovoErrorResponse(List("imovo-error-2"), successfulRequest = false),
        )
    val app = createApp(imovoBackendStub)
    val response = app
      .run(
        Request[IO](
          method = Method.PUT,
          uri = Uri(path = s"/digital-voucher/${subscriptionId.value}"),
        ).withEntity[String](CreateVoucherRequestBody("Everyday").asJson.spaces2),
      )
      .value
      .unsafeRunSync()
      .get

    response.status.code should matchTo(502)
    getBody[DigitalVoucherApiRoutesError](response) should matchTo(
      DigitalVoucherApiRoutesError(
        s"""Imovo failure to create voucher: Imovo create request failed:Request GET ${imovoConfig.imovoBaseUrl}/Subscription/RequestSubscriptionVouchers?SubscriptionId=123456&SchemeName=Guardian7Day&StartDate=$tomorrow failed with response ({
         |  "errorMessages" : [
         |    "imovo-error-1"
         |  ],
         |  "successfulRequest" : false
         |}) and the Imovo get request failed: Request GET ${imovoConfig.imovoBaseUrl}/Subscription/GetSubscriptionVoucherDetails?SubscriptionId=123456 failed with response ({
         |  "errorMessages" : [
         |    "imovo-error-2"
         |  ],
         |  "successfulRequest" : false
         |})""".stripMargin,
      ),
    )
  }

  it should "return a 422 when ratePlanName in create subscription request param doesn't have a scheme name" in {
    val imovoBackendStub: SttpBackendStub[IO, Nothing] =
      SttpBackendStub[IO, Nothing](new CatsMonadAsyncError[IO])

    val app = createApp(imovoBackendStub)
    val response = app
      .run(
        Request[IO](
          method = Method.PUT,
          uri = Uri(path = s"/digital-voucher/${subscriptionId.value}"),
        ).withEntity[String](CreateVoucherRequestBody("HomeDelivery").asJson.spaces2),
      )
      .value
      .unsafeRunSync()
      .get

    response.status.code should matchTo(422)
    getBody[DigitalVoucherApiRoutesError](response) should matchTo(
      DigitalVoucherApiRoutesError(
        "Bad request argument: Rate plan name has no matching scheme name: RatePlanName(HomeDelivery)",
      ),
    )
  }

  it should "return voucher details for replace request with subscriptionId" in {
    val imovoBackendStub: SttpBackendStub[IO, Nothing] =
      SttpBackendStub[IO, Nothing](new CatsMonadAsyncError[IO])
        .stubReplaceSubscription(
          imovoConfig,
          subscriptionId = subscriptionId.value,
          imovoSubscriptionType = ImovoSubscriptionType.Both,
          response = ImovoSubscriptionResponse(
            schemeName = "Guardian7Day",
            subscriptionId = subscriptionId.value,
            successfulRequest = true,
            subscriptionVouchers = List(
              ImovoVoucherResponse("ActiveCard", "replaced-card-test-voucher-code"),
              ImovoVoucherResponse("ActiveLetter", "replaced-letter-test-voucher-code"),
            ),
          ),
        )

    val app = createApp(imovoBackendStub)
    val response = app
      .run(
        Request[IO](
          method = Method.POST,
          Uri(path = path"/digital-voucher/replace"),
        ).withEntity[String](
          SubscriptionActionRequestBody(Some(subscriptionId.value), None, None, Some(true), Some(true)).asJson.spaces2,
        ),
      )
      .value
      .unsafeRunSync()
      .get

    getBody[ReplacementSubscriptionVouchers](response) should matchTo(
      ReplacementSubscriptionVouchers(
        Some("replaced-card-test-voucher-code"),
        Some("replaced-letter-test-voucher-code"),
      ),
    )
    response.status.code should matchTo(200)
  }

  it should "return replaced letter details for replace only letter request with subscriptionId" in {
    val imovoBackendStub: SttpBackendStub[IO, Nothing] =
      SttpBackendStub[IO, Nothing](new CatsMonadAsyncError[IO])
        .stubReplaceSubscription(
          imovoConfig,
          subscriptionId = subscriptionId.value,
          imovoSubscriptionType = ImovoSubscriptionType.ActiveLetter,
          response = ImovoSubscriptionResponse(
            schemeName = "Guardian7Day",
            subscriptionId = subscriptionId.value,
            successfulRequest = true,
            subscriptionVouchers = List(
              ImovoVoucherResponse("ActiveLetter", "replaced-letter-test-voucher-code"),
            ),
          ),
        )

    val app = createApp(imovoBackendStub)
    val response = app
      .run(
        Request[IO](
          method = Method.POST,
          Uri(path = path"/digital-voucher/replace"),
        ).withEntity[String](
          SubscriptionActionRequestBody(Some(subscriptionId.value), None, None, Some(false), Some(true)).asJson.spaces2,
        ),
      )
      .value
      .unsafeRunSync()
      .get

    getBody[ReplacementSubscriptionVouchers](response) should matchTo(
      ReplacementSubscriptionVouchers(None, Some("replaced-letter-test-voucher-code")),
    )
    response.status.code should matchTo(200)
  }

  it should "return replaced card details for replace only card request with subscriptionId" in {
    val imovoBackendStub: SttpBackendStub[IO, Nothing] =
      SttpBackendStub[IO, Nothing](new CatsMonadAsyncError[IO])
        .stubReplaceSubscription(
          imovoConfig,
          subscriptionId = subscriptionId.value,
          imovoSubscriptionType = ImovoSubscriptionType.ActiveCard,
          response = ImovoSubscriptionResponse(
            schemeName = "Guardian7Day",
            subscriptionId = subscriptionId.value,
            successfulRequest = true,
            subscriptionVouchers = List(
              ImovoVoucherResponse("ActiveCard", "replaced-card-test-voucher-code"),
            ),
          ),
        )

    val app = createApp(imovoBackendStub)
    val response = app
      .run(
        Request[IO](
          method = Method.POST,
          Uri(path = path"/digital-voucher/replace"),
        ).withEntity[String](
          SubscriptionActionRequestBody(Some(subscriptionId.value), None, None, Some(true), Some(false)).asJson.spaces2,
        ),
      )
      .value
      .unsafeRunSync()
      .get

    getBody[ReplacementSubscriptionVouchers](response) should matchTo(
      ReplacementSubscriptionVouchers(Some("replaced-card-test-voucher-code"), None),
    )
    response.status.code should matchTo(200)
  }

  it should "return error response when one imovo replace request fails" in {
    val imovoBackendStub: SttpBackendStub[IO, Nothing] =
      SttpBackendStub[IO, Nothing](new CatsMonadAsyncError[IO])
        .stubReplaceSubscription(
          imovoConfig,
          subscriptionId = subscriptionId.value,
          imovoSubscriptionType = ImovoSubscriptionType.Both,
          response = ImovoErrorResponse(Nil, false),
        )

    val app = createApp(imovoBackendStub)
    val response = app
      .run(
        Request[IO](
          method = Method.POST,
          Uri(path = path"/digital-voucher/replace"),
        ).withEntity[String](
          SubscriptionActionRequestBody(Some(subscriptionId.value), None, None, Some(true), Some(true)).asJson.spaces2,
        ),
      )
      .value
      .unsafeRunSync()
      .get

    response.status.code should matchTo(500)
  }

  it should "return voucher details for get subscription request" in {
    val imovoBackendStub: SttpBackendStub[IO, Nothing] =
      SttpBackendStub[IO, Nothing](new CatsMonadAsyncError[IO])
        .stubGetSubscription(
          imovoConfig,
          subscriptionId = subscriptionId.value,
          response = ImovoSubscriptionResponse(
            schemeName = "Guardian7Day",
            subscriptionId = subscriptionId.value,
            successfulRequest = true,
            subscriptionVouchers = List(
              ImovoVoucherResponse("ActiveCard", "card-code"),
              ImovoVoucherResponse("ActiveLetter", "letter-code"),
            ),
          ),
        )

    val app = createApp(imovoBackendStub)
    val response = app
      .run(
        Request(
          method = Method.GET,
          Uri(path = s"/digital-voucher/${subscriptionId.value}"),
        ),
      )
      .value
      .unsafeRunSync()
      .get

    getBody[SubscriptionVouchers](response) should matchTo(SubscriptionVouchers("card-code", "letter-code"))
    response.status.code should matchTo(200)
  }

  it should "return 200 response for cancel request" in {
    val cancellationDate = LocalDate.now().plusWeeks(1)

    val imovoBackendStub: SttpBackendStub[IO, Nothing] =
      SttpBackendStub[IO, Nothing](new CatsMonadAsyncError[IO])
        .stubSubscriptionCancel(
          imovoConfig,
          subscriptionId = subscriptionId.value,
          lastActiveDate = Some(cancellationDate.minusDays(1)),
          response = ImovoSuccessResponse("OK", true),
        )

    val app = createApp(imovoBackendStub)
    val response = app
      .run(
        Request[IO](
          method = Method.POST,
          Uri(path = path"/digital-voucher/cancel"),
        ).withEntity[String](
          CancelSubscriptionVoucherRequestBody(subscriptionId.value, cancellationDate).asJson.spaces2,
        ),
      )
      .value
      .unsafeRunSync()
      .get

    getBody[Unit](response) should equal(())

    response.status.code should equal(200)
  }

  it should "return 200 response for redemption history request with no redemption history" in {

    val imovoBackendStub: SttpBackendStub[IO, Nothing] =
      SttpBackendStub[IO, Nothing](new CatsMonadAsyncError[IO])
        .stubRedemptionHistorySubscription(
          imovoConfig,
          subscriptionId = subscriptionId.value,
          response = ImovoRedemptionHistoryResponse(
            subscriptionId.value,
            0,
            List.empty[ImovoSubscriptionHistoryItem],
            true,
          ),
        )

    val app = createApp(imovoBackendStub)
    val response = app
      .run(
        Request(
          method = Method.GET,
          Uri(path = s"/digital-voucher/redemption-history/${subscriptionId.value}"),
        ),
      )
      .value
      .unsafeRunSync()
      .get

    getBody[RedemptionHistory](response) should equal(RedemptionHistory(List.empty[RedemptionAttempt]))

    response.status.code should equal(200)
  }

  it should "return 200 response for redemption history request" in {

    val redemptionHistoryResponse = List(
      ImovoSubscriptionHistoryItem(
        "abc123",
        "card",
        "2020-06-29T19:19:21.816Z",
        "redemption",
        Some("221B Baker Street, London, U.K."),
        Some("NW1 6XE"),
        "Success",
        2.22,
      ),
      ImovoSubscriptionHistoryItem(
        "abc123",
        "card",
        "2020-07-29T19:19:21.816Z",
        "redemption",
        Some("221B Baker Street, London, U.K."),
        Some("NW1 6XE"),
        "Redemption rejected - this voucher has been used the maximum number of times this period. Please check terms and conditions",
        0.0,
      ),
    )

    val redemptionHistory = RedemptionHistory(
      List(
        RedemptionAttempt(
          "abc123",
          "card",
          "2020-06-29T19:19:21.816Z",
          "redemption",
          Some("221B Baker Street, London, U.K."),
          Some("NW1 6XE"),
          "Success",
          2.22,
        ),
        RedemptionAttempt(
          "abc123",
          "card",
          "2020-07-29T19:19:21.816Z",
          "redemption",
          Some("221B Baker Street, London, U.K."),
          Some("NW1 6XE"),
          "Redemption rejected - this voucher has been used the maximum number of times this period. Please check terms and conditions",
          0.0,
        ),
      ),
    )

    val imovoBackendStub: SttpBackendStub[IO, Nothing] =
      SttpBackendStub[IO, Nothing](new CatsMonadAsyncError[IO])
        .stubRedemptionHistorySubscription(
          imovoConfig,
          subscriptionId = subscriptionId.value,
          response = ImovoRedemptionHistoryResponse(
            subscriptionId.value,
            0,
            redemptionHistoryResponse,
            true,
          ),
        )

    val app = createApp(imovoBackendStub)
    val response = app
      .run(
        Request(
          method = Method.GET,
          Uri(path = s"/digital-voucher/redemption-history/${subscriptionId.value}"),
        ),
      )
      .value
      .unsafeRunSync()
      .get

    getBody[RedemptionHistory](response) should equal(redemptionHistory)

    response.status.code should equal(200)
  }

  private def createApp(backendStub: SttpBackendStub[IO, Nothing]) = {
    inside(DigitalVoucherApiApp(DevIdentity("digital-voucher-api"), backendStub).value.unsafeRunSync()) {
      case Right(value) => value
    }
  }

  private def getBody[A: Decoder](response: Response[IO]) = {
    val bodyString = response.bodyText.compile.toList
      .unsafeRunSync()
      .mkString("")

    decode[A](bodyString)
      .fold(
        error => fail(s"Failed to decode response body $bodyString: $error"),
        identity,
      )
  }
}
