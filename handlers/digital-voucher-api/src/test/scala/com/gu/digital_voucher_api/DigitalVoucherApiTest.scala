package com.gu.digital_voucher_api

import cats.effect.IO
import io.circe.Decoder
import io.circe.syntax._
import io.circe.generic.auto._
import io.circe.parser.decode
import org.http4s.{Method, Request, Response, Uri}
import org.scalatest.{EitherValues, FlatSpec, Matchers}

class DigitalVoucherApiTest extends FlatSpec with Matchers with EitherValues {
  "DigitalVoucherApi" should "return stubbed voucher details" in {
    val app = createApp()
    val response = app.run(
      Request(
        method = Method.PUT,
        Uri(path = s"/digital-voucher/create/123456")
      ).withEntity[String](CreateVoucherRequestBody("Rate-Plan-Name").asJson.spaces2)
    ).value.unsafeRunSync().get

    getBody[Voucher](response) should equal(Voucher("123456", "654321"))
    response.status.code should equal(200)
  }

  private def createApp() = {
    DigitalVoucherApiApp().value.unsafeRunSync().right.value
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
