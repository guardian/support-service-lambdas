package com.gu.productmove.zuora

import com.gu.productmove.EmailMessage
import com.gu.productmove.zuora.GetSubscription
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import com.gu.productmove.zuora.CreateSubscriptionResponse
import com.gu.productmove.zuora.InvoicePreview.ZuoraInvoiceList
import software.amazon.awssdk.services.sqs.SqsAsyncClient
import zio.{IO, ZIO}

import java.time.LocalDate

class MockInvoicePreview(responses: Map[(String, LocalDate), ZuoraInvoiceList]) extends InvoicePreview {

  private var mutableStore: List[(String, LocalDate)] = Nil // we need to remember the side effects

  def requests = mutableStore.reverse

  override def get(zuoraAccountId: String, targetDate: LocalDate): ZIO[Any, String, ZuoraInvoiceList] = {
    mutableStore = (zuoraAccountId, targetDate) :: mutableStore

    responses.get((zuoraAccountId, targetDate)) match
      case Some(stubbedResponse) => ZIO.succeed(stubbedResponse)
      case None => ZIO.fail(s"success = false")
  }
}

object MockInvoicePreview {
  def requests: ZIO[MockInvoicePreview, Nothing, List[(String, LocalDate)]] = ZIO.serviceWith[MockInvoicePreview](_.requests)
}
