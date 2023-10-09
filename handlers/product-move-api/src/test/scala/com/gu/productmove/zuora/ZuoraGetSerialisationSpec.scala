package com.gu.productmove.zuora

import com.gu.productmove.{SecretsLive, SttpClientLive}
import com.gu.productmove.zuora.InvoiceItemAdjustment.{InvoiceItemAdjustmentResult, InvoiceItemAdjustmentsWriteRequest}
import com.gu.productmove.zuora.model.SubscriptionName
import zio.Scope
import zio.{IO, ZIO}
import zio.*
import zio.test.Assertion.*
import zio.test.*
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGet, ZuoraGetLive, ZuoraRestBody}
import sttp.client3.UriContext
import sttp.client3.testing.SttpBackendStub

import java.time.LocalDate

object ZuoraGetSerialisationSpec extends ZIOSpecDefault {
  override def spec: Spec[TestEnvironment with Scope, Any] =
    suite("ZuoraGetSerialisation")(
      test("can deserialise a list") {
        for {
          result <- ZuoraGet
            .post[InvoiceItemAdjustmentsWriteRequest, List[InvoiceItemAdjustmentResult]](
              uri"action/create",
              InvoiceItemAdjustmentsWriteRequest(objects = Nil),
              ZuoraRestBody.ZuoraSuccessCheck.None,
            )
            .provide(
              ZuoraGetLive.layer,
              ZLayer.succeed(
                new MockZuoraClient(
                  """
                  |[{"Id":"8ad085e289de67b00189dfbf1cc62efb","Success":true}]
                  |""".stripMargin,
                ),
              ),
            )
        } yield assert(true)(equalTo(true))
      },
    )

}
