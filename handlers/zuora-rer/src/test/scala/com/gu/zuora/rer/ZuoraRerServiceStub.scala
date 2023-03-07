package com.gu.zuora.rer

import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError}

class ZuoraRerServiceStub(
    contacts: ClientFailableOp[List[ZuoraContact]],
    zuoraVerifyErasureOrError: Either[ZuoraRerError, Unit],
    zuoraAccountUpdateOrError: Either[ZuoraRerError, Unit],
) extends ZuoraRer {
  override def zuoraContactsWithEmail(emailAddress: String): ClientFailableOp[List[ZuoraContact]] = contacts
  override def verifyErasure(contact: ZuoraContact): Either[ZuoraRerError, Unit] = zuoraVerifyErasureOrError
  override def scrubAccount(contact: ZuoraContact): Either[ZuoraRerError, Unit] = zuoraAccountUpdateOrError
}

object ZuoraRerServiceStub {
  val successfulZuoraContacts: ClientSuccess[List[ZuoraContact]] = ClientSuccess(
    List(ZuoraContact("123456789", "a@b.com")),
  )
  val zeroZuoraContactsResponse: ClientSuccess[List[ZuoraContact]] = ClientSuccess(Nil)
  val failedZuoraContactResponse: GenericError = GenericError("Failed to get contacts")

  val zuoraVerifyErasureSuccess = Right(())
  val zuoraVerifyErasureFailure = Left(PreconditionCheckError("pre-condition checks failed"))

  val zuoraScrubAccountSuccess = Right(())
  val zuoraScrubAccountFailure = Left(ZuoraClientError("scrub account error"))

  def withSuccessResponse =
    new ZuoraRerServiceStub(successfulZuoraContacts, zuoraVerifyErasureSuccess, zuoraScrubAccountSuccess)
  def withFailedContactResponse =
    new ZuoraRerServiceStub(failedZuoraContactResponse, zuoraVerifyErasureSuccess, zuoraScrubAccountSuccess)
  def withNoContactsResponse =
    new ZuoraRerServiceStub(zeroZuoraContactsResponse, zuoraVerifyErasureSuccess, zuoraScrubAccountSuccess)
  def withFailedVerifyErasureResponse =
    new ZuoraRerServiceStub(successfulZuoraContacts, zuoraVerifyErasureFailure, zuoraScrubAccountFailure)
  def withFailedScrubAccountResponse =
    new ZuoraRerServiceStub(successfulZuoraContacts, zuoraVerifyErasureSuccess, zuoraScrubAccountFailure)
}
