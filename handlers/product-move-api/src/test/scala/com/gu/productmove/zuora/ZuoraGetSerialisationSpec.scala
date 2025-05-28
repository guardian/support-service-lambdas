package com.gu.productmove.zuora

import com.gu.productmove.zuora.InvoiceItemAdjustment.{InvoiceItemAdjustmentResult, InvoiceItemAdjustmentsWriteRequest}
import com.gu.productmove.zuora.model.SubscriptionName
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGet, ZuoraGetLive, ZuoraRestBody}
import com.gu.productmove.{SecretsLive, SttpClientLive}
import sttp.client3.UriContext
import sttp.client3.testing.SttpBackendStub
import zio.*
import zio.test.*
import zio.test.Assertion.*

import java.time.LocalDate

object ZuoraGetSerialisationSpec extends ZIOSpecDefault {
  override def spec: Spec[TestEnvironment & Scope, Any] =
    suite("ZuoraGetSerialisation")(
      test("can deserialise a list") {
        for {
          result <- ZIO
            .serviceWith[ZuoraGet](
              _.post[InvoiceItemAdjustmentsWriteRequest, List[InvoiceItemAdjustmentResult]](
                uri"action/create",
                InvoiceItemAdjustmentsWriteRequest(objects = Nil),
                ZuoraRestBody.ZuoraSuccessCheck.None,
              ),
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
