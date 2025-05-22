package com.gu.productmove.zuora

import com.gu.productmove.zuora.PostInvoices.InvoiceId
import com.gu.productmove.zuora.rest.{ZuoraGet, ZuoraRestBody}
import sttp.client3.*
import zio.json.*
import zio.{Task, URLayer, ZIO, ZLayer}

import java.time.LocalDate

object PostInvoicesLive {
  val layer: URLayer[ZuoraGet, PostInvoices] =
    ZLayer.fromFunction(PostInvoicesLive(_))
}

private class PostInvoicesLive(zuoraGet: ZuoraGet) extends PostInvoices {
  import PostInvoices.*

  // https://developer.zuora.com/v1-api-reference/api/operation/POST_PostInvoices/
  override def run(invoiceId: InvoiceId, invoiceDate: LocalDate): Task[Unit] =
    for {
      postInvoicesResponse <- zuoraGet
        .post[PostInvoicesRequest, PostInvoicesResponse](
          uri"invoices/bulk-post",
          PostInvoicesRequest(List(InvoiceToPost(invoiceId, invoiceDate)), "Invoice"),
//          ZuoraRestBody.ZuoraSuccessCheck.None,
        )
        .map(_.head) // we have hard coded one item in the request so there will be one in the response
//      maybeInvoiceId <- errorOrPostInvoicesResponse match {
//        case Left(PostInvoicesErrorResponse(ZuoraError("INVALID_VALUE", _) :: _)) => ZIO.none
//        case Left(error: PostInvoicesErrorResponse) => ZIO.fail(new RuntimeException("generate invoice failed with: " + error))
//        case Right(PostInvoicesResponse: PostInvoicesSuccessResponse) => ZIO.some(InvoiceId(PostInvoicesResponse.Id))
//      }
    } yield ()

  private case class InvoiceToPost(id: InvoiceId, invoiceDate: LocalDate)
      derives JsonEncoder
  private case class PostInvoicesRequest(objects: List[InvoiceToPost], `type`: String) derives JsonEncoder
}

trait PostInvoices {
  def run(accountId: ZuoraAccountId, today: LocalDate): Task[Unit]
}

object PostInvoices {
  given eitherDecoder[A: JsonDecoder, B: JsonDecoder]: JsonDecoder[Either[A, B]] =
    summon[JsonDecoder[A]].orElseEither(summon[JsonDecoder[B]])

  private[zuora] case class PostInvoicesSuccessResponse(
    Id: String, // ID of the generated invoice
  ) derives JsonDecoder
  private[zuora] case class ZuoraError(Code: String, Message: String) derives JsonDecoder
  private[zuora] case class PostInvoicesErrorResponse(Errors: List[ZuoraError]) derives JsonDecoder

  private[zuora] type PostInvoicesResponse = List[Either[PostInvoicesErrorResponse, PostInvoicesSuccessResponse]]
  given JsonDecoder[PostInvoicesResponse] = JsonDecoder.list(using eitherDecoder[PostInvoicesErrorResponse, PostInvoicesSuccessResponse])

  case class InvoiceId(id: String)

}
