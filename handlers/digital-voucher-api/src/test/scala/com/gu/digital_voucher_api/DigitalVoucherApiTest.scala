package com.gu.digital_voucher_api

import cats.effect.IO
import com.gu.DevIdentity
import com.softwaremill.sttp.impl.cats.CatsMonadError
import com.softwaremill.sttp.testing.SttpBackendStub
import io.circe.Decoder
import io.circe.syntax._
import io.circe.generic.auto._
import io.circe.parser.decode
import org.http4s.{Method, Request, Response, Uri}
import org.scalatest.{EitherValues, FlatSpec, Inside, Matchers}
import com.gu.digital_voucher_api.imovo.ImovoStub._
import com.gu.digital_voucher_api.imovo.ImovoVoucherResponse

class DigitalVoucherApiTest extends FlatSpec with Matchers with EitherValues {
  "DigitalVoucherApi" should "return stubbed voucher details for create request" in {
    val app = createApp(SttpBackendStub[IO, Nothing](new CatsMonadError[IO]))
    val response = app.run(
      Request(
        method = Method.PUT,
        Uri(path = "/digital-voucher/create/sub123456")
      ).withEntity[String](CreateVoucherRequestBody("Rate-Plan-Name").asJson.spaces2)
    ).value.unsafeRunSync().get

    getBody[Voucher](response) should equal(Voucher("1111111111", "2222222222"))
    response.status.code should equal(200)
  }
  it should "return stubbed voucher details for replace request" in {
    val imovoBackendStub: SttpBackendStub[IO, Nothing] = SttpBackendStub[IO, Nothing](new CatsMonadError[IO])
      .stubReplace(
        apiKey = "imovo-test-api-key",
        baseUrl = "https://imovo.test.com",
        voucherCode = "card-test-voucher-code",
        response = ImovoVoucherResponse("replaced-card-test-voucher-code", 0.0, "")
      )
      .stubReplace(
        apiKey = "imovo-test-api-key",
        baseUrl = "https://imovo.test.com",
        voucherCode = "letter-test-voucher-code",
        response = ImovoVoucherResponse("replaced-letter-test-voucher-code", 0.0, "")
      )

    val app = createApp(imovoBackendStub)
    val response = app.run(
      Request(
        method = Method.POST,
        Uri(path = "/digital-voucher/replace")
      ).withEntity[String](Voucher("card-test-voucher-code", "letter-test-voucher-code").asJson.spaces2)
    ).value.unsafeRunSync().get

    getBody[Voucher](response) should equal(
      Voucher("replaced-card-test-voucher-code", "replaced-letter-test-voucher-code")
    )
    response.status.code should equal(200)
  }
  it should "return stubbed voucher details for get request" in {
    val app = createApp(SttpBackendStub[IO, Nothing](new CatsMonadError[IO]))
    val response = app.run(
      Request(
        method = Method.GET,
        Uri(path = "/digital-voucher/sub123456")
      )
    ).value.unsafeRunSync().get

    getBody[Voucher](response) should equal(Voucher("5555555555", "6666666666"))
    response.status.code should equal(200)
  }
  it should "return stubbed 200 response for delete request" in {
    val app = createApp(SttpBackendStub[IO, Nothing](new CatsMonadError[IO]))
    val response = app.run(
      Request(
        method = Method.DELETE,
        Uri(path = "/digital-voucher/123456")
      )
    ).value.unsafeRunSync().get

    response.status.code should equal(200)
  }

  private def createApp(backendStub: SttpBackendStub[IO, Nothing]) = {
    Inside.inside(DigitalVoucherApiApp(DevIdentity("digital-voucher-api"), backendStub).value.unsafeRunSync()) {
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
