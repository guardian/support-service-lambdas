package com.gu.digital_voucher_api

import cats.effect.IO
import com.gu.DevIdentity
import io.circe.Decoder
import io.circe.syntax._
import io.circe.generic.auto._
import io.circe.parser.decode
import org.http4s.{Method, Request, Response, Uri}
import org.scalatest.{EitherValues, FlatSpec, Inside, Matchers}

class DigitalVoucherApiTest extends FlatSpec with Matchers with EitherValues {
  "DigitalVoucherApi" should "return stubbed voucher details for create request" in {
    val app = createApp()
    val response = app.run(
      Request(
        method = Method.PUT,
        Uri(path = "/digital-voucher/create/sub123456")
      ).withEntity[String](CreateVoucherRequestBody("Rate-Plan-Name").asJson.spaces2)
    ).value.unsafeRunSync().get

    getBody[Voucher](response) should equal(Voucher("sub123456-card-code", "sub123456-letter-code"))
    response.status.code should equal(200)
  }
  it should "return stubbed voucher details for replace request" in {
    val app = createApp()
    val response = app.run(
      Request(
        method = Method.PUT,
        Uri(path = "/digital-voucher/replace/sub123456")
      ).withEntity[String](CreateVoucherRequestBody("Rate-Plan-Name").asJson.spaces2)
    ).value.unsafeRunSync().get

    getBody[Voucher](response) should equal(Voucher("sub123456-replaced-card-code", "sub123456-replaced-letter-code"))
    response.status.code should equal(200)
  }
  it should "return stubbed voucher details for get request" in {
    val app = createApp()
    val response = app.run(
      Request(
        method = Method.GET,
        Uri(path = "/digital-voucher/sub123456")
      )
    ).value.unsafeRunSync().get

    getBody[Voucher](response) should equal(Voucher("sub123456-card-code", "sub123456-letter-code"))
    response.status.code should equal(200)
  }
  it should "return stubbed 200 response for delete request" in {
    val app = createApp()
    val response = app.run(
      Request(
        method = Method.DELETE,
        Uri(path = "/digital-voucher/123456")
      )
    ).value.unsafeRunSync().get

    response.status.code should equal(200)
  }

  private def createApp() = {
    Inside.inside(DigitalVoucherApiApp(DevIdentity("digital-voucher-api")).value.unsafeRunSync()) {
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
