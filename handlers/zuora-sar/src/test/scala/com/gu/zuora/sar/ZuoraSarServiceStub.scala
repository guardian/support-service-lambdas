package com.gu.zuora.sar
import java.io.ByteArrayInputStream

import com.gu.util.resthttp.RestRequestMaker.DownloadStream
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError}
import play.api.libs.json.Json

class ZuoraSarServiceStub(
    contacts: ClientFailableOp[List[ZuoraContact]],
    zuoraAccountSuccessOrError: Either[ZuoraSarError, ZuoraAccountSuccess],
    zuoraInvoiceStreamsOrError: Either[ZuoraSarError, List[DownloadStream]],
) extends ZuoraSar {
  override def zuoraContactsWithEmail(emailAddress: String): ClientFailableOp[List[ZuoraContact]] = contacts
  override def accountResponse(contact: ZuoraContact): Either[ZuoraSarError, ZuoraAccountSuccess] =
    zuoraAccountSuccessOrError
  override def invoicesResponse(accountInvoices: List[InvoiceId]): Either[ZuoraSarError, List[DownloadStream]] =
    zuoraInvoiceStreamsOrError
}

object ZuoraSarServiceStub {
  val successfulZuoraContacts: ClientSuccess[List[ZuoraContact]] = ClientSuccess(List(ZuoraContact("123456789")))
  val failedZuoraContactResponse: GenericError = GenericError("Failed to get contacts")

  val accountSummary: String =
    """
      {
        "accountSummary": "summary"
      }
    """.stripMargin

  val accountObject: String =
    """
      {
        "accountSummary": "summary"
      }
    """.stripMargin

  val stubInputStream = new ByteArrayInputStream("test data".getBytes)

  val zuoraAccountSuccess = Right(
    ZuoraAccountSuccess(Json.parse(accountSummary), Json.parse(accountObject), InvoiceIds(List(InvoiceId("123abc")))),
  )
  val zuoraAccountFailure = Left(ZuoraClientError("client error"))

  val zuoraInvoiceSuccess = Right(List(DownloadStream(stubInputStream, 123)))
  val zuoraInvoiceFailure = Left(JsonDeserialisationError("failed to deserialise invoices"))

  def withSuccessResponse = new ZuoraSarServiceStub(successfulZuoraContacts, zuoraAccountSuccess, zuoraInvoiceSuccess)
  def withFailedContactResponse =
    new ZuoraSarServiceStub(failedZuoraContactResponse, zuoraAccountSuccess, zuoraInvoiceSuccess)
  def withFailedAccountResponse =
    new ZuoraSarServiceStub(successfulZuoraContacts, zuoraAccountFailure, zuoraInvoiceSuccess)
  def withFailedInvoiceResponse =
    new ZuoraSarServiceStub(successfulZuoraContacts, zuoraAccountSuccess, zuoraInvoiceFailure)
}
