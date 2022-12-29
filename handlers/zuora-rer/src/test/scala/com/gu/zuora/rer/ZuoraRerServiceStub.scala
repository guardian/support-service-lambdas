package com.gu.zuora.rer

import java.io.ByteArrayInputStream

import com.gu.util.resthttp.RestRequestMaker.DownloadStream
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError}
import play.api.libs.json.Json

class ZuoraRerServiceStub(
  contacts: ClientFailableOp[List[ZuoraContact]],
  zuoraVerifyErasureOrError: Either[ZuoraRerError, Unit],
  zuoraAccountUpdateOrError: Either[ZuoraRerError, Unit]
) extends ZuoraRer {
  override def zuoraContactsWithEmail(emailAddress: String): ClientFailableOp[List[ZuoraContact]] = contacts
  override def verifyErasure(contact: ZuoraContact): Either[ZuoraRerError, Unit] = zuoraVerifyErasureOrError
  override def scrubAccount(contact: ZuoraContact): Either[ZuoraRerError, Unit] = zuoraAccountUpdateOrError
}

object ZuoraRerServiceStub {
  val successfulZuoraContacts: ClientSuccess[List[ZuoraContact]] = ClientSuccess(List(ZuoraContact("123456789", "a@b.com")))
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

  val zuoraAccountSuccess = Right(ZuoraAccountSuccess(Json.parse(accountSummary), Json.parse(accountObject), InvoiceIds(List(InvoiceId("123abc")))))
  val zuoraAccountFailure = Left(ZuoraClientError("client error"))

  val zuoraInvoiceSuccess = Right(List(DownloadStream(stubInputStream, 123)))
  val zuoraInvoiceFailure = Left(JsonDeserialisationError("failed to deserialise invoices"))

  val zuoraVerifyErasureSuccess = Right(())
  val zuoraVerifyErasureFailure = Left(ZuoraClientError("can't erase account"))

  val zuoraScrubAccountSuccess = Right(())
  val zuoraScrubAccountFailure = Left(ZuoraClientError("scrub account error"))

  def withSuccessResponse = new ZuoraRerServiceStub(successfulZuoraContacts, zuoraVerifyErasureSuccess, zuoraScrubAccountSuccess)
  def withFailedContactResponse = new ZuoraRerServiceStub(failedZuoraContactResponse, zuoraVerifyErasureSuccess, zuoraScrubAccountSuccess)
  def withFailedVerifyErasureResponse = new ZuoraRerServiceStub(successfulZuoraContacts, zuoraVerifyErasureFailure, zuoraScrubAccountFailure)
  def withFailedScrubAccountResponse = new ZuoraRerServiceStub(successfulZuoraContacts, zuoraVerifyErasureSuccess, zuoraScrubAccountFailure)
}
