package com.gu.zuora

import com.gu.util.resthttp.RestRequestMaker.{DownloadStream, Requests, WithoutCheck}
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientFailure}
import com.gu.util.zuora.ZuoraQuery.ZuoraQuerier
import com.gu.util.zuora.SafeQueryBuilder.Implicits._
import com.typesafe.scalalogging.LazyLogging
import play.api.libs.json.{JsValue, Json}
import cats.syntax.traverse._
import cats.instances.list._
import cats.instances.either._

// For Zuora response deserialisation
case class ZuoraContact(AccountId: String)
case class InvoiceId(id: String)
case class InvoiceIds(invoices: List[InvoiceId])
case class InvoicePdfUrl(pdfFileUrl: String)
case class InvoiceFiles(invoiceFiles: List[InvoicePdfUrl])

trait ZuoraSarSuccess
case class ZuoraAccountSuccess(accountSummary: JsValue, accountObj: JsValue, invoiceList: InvoiceIds) extends ZuoraSarSuccess
case class InvoiceSuccess(fullInvoice: JsValue) extends ZuoraSarSuccess

trait ZuoraSarError
case class ZuoraClientError(message: String) extends ZuoraSarError
case class JsonDeserialisationError(message: String) extends ZuoraSarError
case class S3WriteError(message: String) extends ZuoraSarError

case class ZuoraHelperError(message: String)

case class ZuoraHelper(zuoraClient: Requests, zuoraDownloadClient: Requests, zuoraQuerier: ZuoraQuerier) extends LazyLogging {


  implicit val readsC = Json.reads[ZuoraContact]

  def zuoraContactsWithEmail(emailAddress: String): ClientFailableOp[List[ZuoraContact]] = {
    for {
      contactQuery <- zoql"SELECT AccountId FROM Contact where WorkEmail=${emailAddress}"
      queryResult <- zuoraQuerier[ZuoraContact](contactQuery).map(_.records)
    } yield queryResult
  }

  private def accountSummary(accountId: String): Either[ClientFailure, JsValue] =
    zuoraClient.get[JsValue](s"accounts/$accountId/summaryy").toDisjunction

  private def accountObj(accountId: String): Either[ClientFailure, JsValue] = {
    zuoraClient.get[JsValue](s"object/account/$accountId", WithoutCheck).toDisjunction
  }

  implicit val readsPdfUrls = Json.reads[InvoicePdfUrl]
  implicit val readInvoiceFiles = Json.reads[InvoiceFiles]

  private def getInvoiceFiles(invoiceId: String): Either[ClientFailure, InvoiceFiles] =
    zuoraClient.get[InvoiceFiles](s"invoices/$invoiceId/files").toDisjunction

  // The zuora client includes /v1 in the URL but it also appears in the pdfFileUrl obtained from the call to
  // invoices/invoiceId/files so this removes the duplication
  private def invoiceFileContents(pdfUrls: List[InvoicePdfUrl]): Either[ClientFailure, List[DownloadStream]] = {
    pdfUrls.traverse(pdfUrl => {
      val urlSuffix = pdfUrl.pdfFileUrl.replace("/v1/", "")
      zuoraDownloadClient.getDownloadStream(urlSuffix).toDisjunction
    })
  }

  implicit val readsIIds = Json.reads[InvoiceId]
  implicit val readsIn = Json.reads[InvoiceIds]

  def accountResponse(contact: ZuoraContact): Either[ZuoraSarError, ZuoraAccountSuccess] = {
    for {
      accountSummary <- accountSummary(contact.AccountId).left.map(err => ZuoraClientError(err.message))
      accountObj <- accountObj(contact.AccountId).left.map(err => ZuoraClientError(err.message))
      invoices <- Json.fromJson[InvoiceIds](accountSummary).asEither.left.map(err => JsonDeserialisationError(err.toString()))
      zuoraSarResponse = ZuoraAccountSuccess(accountSummary, accountObj, invoices)
    } yield zuoraSarResponse
  }

  def invoicesResponse(accountInvoices: List[InvoiceId]): Either[ZuoraSarError, List[DownloadStream]] = {
    accountInvoices.flatTraverse { invoice =>
      for {
        invoices <- getInvoiceFiles(invoice.id).left.map(err => ZuoraClientError(err.message))
        invoiceDownloadStreams <- invoiceFileContents(invoices.invoiceFiles).left.map(err => ZuoraClientError(err.message))
      } yield {
        invoiceDownloadStreams
      }
    }
  }

}
