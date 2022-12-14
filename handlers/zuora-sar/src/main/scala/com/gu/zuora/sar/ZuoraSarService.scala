package com.gu.zuora.sar

import com.gu.util.resthttp.RestRequestMaker.{DownloadStream, Requests, WithoutCheck}
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientFailure, GenericError}
import com.gu.util.zuora.ZuoraQuery.ZuoraQuerier
import com.gu.util.zuora.SafeQueryBuilder.Implicits._
import com.typesafe.scalalogging.LazyLogging
import play.api.libs.json.{JsValue, Json, Reads}
import cats.syntax.traverse._

// For Zuora response deserialisation
case class ZuoraContact(AccountId: String)
case class AccountNumber(AccountNumber: String)
case class InvoiceId(id: String)
case class InvoiceIds(invoices: List[InvoiceId])
case class InvoicePdfUrl(pdfFileUrl: String)
case class InvoiceFiles(invoiceFiles: List[InvoicePdfUrl])

case class ZuoraAccountSuccess(accountSummary: JsValue, accountObj: JsValue, invoiceList: InvoiceIds)

trait ZuoraSarError
case class ZuoraClientError(message: String) extends ZuoraSarError
case class JsonDeserialisationError(message: String) extends ZuoraSarError

trait ZuoraSar {
  def zuoraContactsWithEmail(emailAddress: String): ClientFailableOp[List[ZuoraContact]]
  def accountResponse(contact: ZuoraContact): Either[ZuoraSarError, ZuoraAccountSuccess]
  def invoicesResponse(accountInvoices: List[InvoiceId]): Either[ZuoraSarError, List[DownloadStream]]
}

case class ZuoraSarService(zuoraClient: Requests, zuoraDownloadClient: Requests, zuoraQuerier: ZuoraQuerier)
    extends ZuoraSar
    with LazyLogging {

  implicit val readsC: Reads[ZuoraContact] = Json.reads[ZuoraContact]

  override def zuoraContactsWithEmail(emailAddress: String): ClientFailableOp[List[ZuoraContact]] = {
    for {
      contactQuery <- zoql"SELECT AccountId FROM Contact where WorkEmail=$emailAddress"
      queryResult <- zuoraQuerier[ZuoraContact](contactQuery).map(_.records)
    } yield queryResult
  }

  private def accountSummary(accountId: String): Either[ClientFailure, JsValue] =
    zuoraClient.get[JsValue](s"accounts/$accountId/summary").toDisjunction

  implicit val readsOb: Reads[AccountNumber] = Json.reads[AccountNumber]

  private def accountObj(accountId: String): Either[ClientFailure, JsValue] = {
    /* The WithCheck object validates a JSON response by checking if a 'success' field is set as 'true'.
     * For some reason, this particular endpoint doesn't return that field so WithoutCheck is passed to the .get method
     * and a custom check to see if an AccountNumber is present in the response is made instead.
     */
    zuoraClient.get[JsValue](s"object/account/$accountId", WithoutCheck).toDisjunction.flatMap { accountObjectRes =>
      Json.fromJson[AccountNumber](accountObjectRes).asEither match {
        case Left(err) => Left(GenericError(s"Unable to find AccountNumber in account object response: $err"))
        case Right(_) => Right(accountObjectRes)
      }
    }
  }

  implicit val readsPdfUrls: Reads[InvoicePdfUrl] = Json.reads[InvoicePdfUrl]
  implicit val readInvoiceFiles: Reads[InvoiceFiles] = Json.reads[InvoiceFiles]

  private def getInvoiceFiles(invoiceId: String): Either[ClientFailure, InvoiceFiles] =
    zuoraClient.get[InvoiceFiles](s"invoices/$invoiceId/files").toDisjunction

  private def invoiceFileContents(pdfUrls: List[InvoicePdfUrl]): Either[ClientFailure, List[DownloadStream]] = {
    pdfUrls.traverse(pdfUrl => {
      /* The pdf url provided in the invoice only sometimes includes a content-length header. Content-length
       * is required to upload to S3. For this reason, we're using the 'batch-query' endpoint and a zuoraDownloadClient instead.
       */
      val fileIdUrl = pdfUrl.pdfFileUrl.replace("/v1/files/", "batch-query/file/")
      zuoraDownloadClient.getDownloadStream(fileIdUrl).toDisjunction
    })
  }

  implicit val readsIIds: Reads[InvoiceId] = Json.reads[InvoiceId]
  implicit val readsIn: Reads[InvoiceIds] = Json.reads[InvoiceIds]

  override def accountResponse(contact: ZuoraContact): Either[ZuoraSarError, ZuoraAccountSuccess] = {
    logger.info("Retrieving account summary and account object for contact.")
    for {
      accountSummary <- accountSummary(contact.AccountId).left.map(err => ZuoraClientError(err.message))
      accountObj <- accountObj(contact.AccountId).left.map(err => ZuoraClientError(err.message))
      invoices <- Json
        .fromJson[InvoiceIds](accountSummary)
        .asEither
        .left
        .map(err => JsonDeserialisationError(err.toString()))
      zuoraSarResponse = ZuoraAccountSuccess(accountSummary, accountObj, invoices)
    } yield zuoraSarResponse
  }

  override def invoicesResponse(accountInvoices: List[InvoiceId]): Either[ZuoraSarError, List[DownloadStream]] = {
    logger.info("Retrieving invoices for contact.")
    accountInvoices.flatTraverse { invoice =>
      for {
        invoices <- getInvoiceFiles(invoice.id).left.map(err => ZuoraClientError(err.message))
        invoiceDownloadStreams <- invoiceFileContents(invoices.invoiceFiles).left.map(err =>
          ZuoraClientError(err.message),
        )
      } yield {
        invoiceDownloadStreams
      }
    }
  }

}
