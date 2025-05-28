package com.gu.productmove.zuora

import com.gu.productmove.zuora.RunBilling.InvoiceId
import com.gu.productmove.zuora.rest.{ZuoraGet, ZuoraRestBody}
import sttp.client3.*
import zio.json.*
import zio.{Task, URLayer, ZIO, ZLayer}

import java.time.LocalDate

object PostInvoicesLive {
  val layer: URLayer[ZuoraGet, PostInvoices] =
    ZLayer.fromFunction(PostInvoicesLive(_))
}

private class PostInvoicesLive(zuoraClient: ZuoraGet) extends PostInvoices {
  import PostInvoices.*

  // https://developer.zuora.com/v1-api-reference/api/operation/POST_PostInvoices/
  override def postInvoices(invoiceId: InvoiceId, invoiceDate: LocalDate): Task[Unit] =
    for {
      postInvoicesResponse <- zuoraClient
        .post[PostInvoicesRequest, PostInvoicesResponse](
          uri"invoices/bulk-post",
          PostInvoicesRequest(List(InvoiceToPost(invoiceId, invoiceDate))),
        )
      _ <- ZIO.fromEither(maybeError(postInvoicesResponse).toLeft(()))
    } yield ()

  private case class InvoiceToPost(id: InvoiceId, invoiceDate: LocalDate) derives JsonEncoder
  private case class PostInvoicesRequest(invoices: List[InvoiceToPost]) derives JsonEncoder

  /*
  could be {
  "invoices" : [ {
    "success" : false,
    "processId" : "A76470DC0101BCBB",
    "reasons" : [ {
      "code" : 59210020,
      "message" : "Only invoices with Draft status can be posted."
    } ],
    "id" : "8ad083f096d239110196d438cee520d5"
  } ],
  "success" : true
}
   * */
}

trait PostInvoices {
  def postInvoices(invoiceId: InvoiceId, invoiceDate: LocalDate): Task[Unit]
}

object PostInvoices {

  def maybeError(postInvoicesResponse: PostInvoicesResponse): Option[Throwable] = {
    postInvoicesResponse match {
      case PostInvoicesResponse(List(InvoiceStatus(true, _))) => None
      case PostInvoicesResponse(
            List(
              InvoiceStatus(false, Some(List(ZuoraError(59210020, "Only invoices with Draft status can be posted.")))),
            ),
          ) =>
        None
      case resp => Some(new RuntimeException("unexpected bulk-post response: " + resp))
    }
  }

  private[zuora] case class PostInvoicesResponse(invoices: List[InvoiceStatus]) derives JsonDecoder

  private[zuora] case class InvoiceStatus(success: Boolean, reasons: Option[List[ZuoraError]]) derives JsonDecoder

  private[zuora] case class ZuoraError(code: Int, message: String) derives JsonDecoder

}
