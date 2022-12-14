package com.gu.zuora.sar

import cats.effect.IO
import com.gu.zuora.sar.BatonModels.{Completed, Failed, PerformSarRequest, PerformSarResponse, SarRequest, SarResponse}
import com.typesafe.scalalogging.LazyLogging
import cats.syntax.traverse._

case class ZuoraPerformSarHandler(zuoraHelper: ZuoraSar, s3Service: S3Service, zuoraSarConfig: ZuoraSarConfig)
    extends LazyLogging
    with ZuoraHandler[SarRequest, SarResponse] {

  def processAccountDetails(
      contacts: List[ZuoraContact],
      initiationReference: String,
  ): Either[ZuoraSarError, List[InvoiceIds]] =
    contacts.traverse { contact =>
      for {
        zuoraAccountSuccess <- zuoraHelper.accountResponse(contact)
        _ <- s3Service.writeSuccessAccountResult(initiationReference, zuoraAccountSuccess, zuoraSarConfig)
      } yield zuoraAccountSuccess.invoiceList
    }

  def processInvoicesForContacts(
      allContactInvoices: List[InvoiceIds],
      initiationReference: String,
  ): Either[ZuoraSarError, List[Unit]] =
    allContactInvoices.traverse { accountInvoices =>
      for {
        downloadStreams <- zuoraHelper.invoicesResponse(accountInvoices.invoices)
        _ <- s3Service.writeSuccessInvoiceResult(initiationReference, downloadStreams, zuoraSarConfig)
      } yield ()
    }

  def initiateSar(
      request: PerformSarRequest,
  ): Either[ZuoraSarError, Unit] = {
    zuoraHelper.zuoraContactsWithEmail(request.subjectEmail).toDisjunction match {
      case Left(err) =>
        logger.error("Failed to perform subject access request to Zuora.")
        Left(ZuoraClientError(err.message))
      case Right(contactList) =>
        for {
          invoiceIds <- processAccountDetails(contactList, request.initiationReference)
          _ <- processInvoicesForContacts(invoiceIds, request.initiationReference)
          _ <- s3Service.copyResultsToCompleted(request.initiationReference, zuoraSarConfig)
        } yield Right(())
    }
  }

  override def handle(
      request: SarRequest,
  ): IO[SarResponse] = {
    request match {
      case r: PerformSarRequest =>
        val res = initiateSar(r)
        res match {
          case Left(err) =>
            s3Service.writeFailedResult(r.initiationReference, err, zuoraSarConfig)
            IO.pure(PerformSarResponse(Failed, r.initiationReference, r.subjectEmail, Some(err.toString)))
          case Right(_) => IO.pure(PerformSarResponse(Completed, r.initiationReference, r.subjectEmail))
        }
      case _ =>
        val error = "Unable to retrieve email and initiation reference from request"
        logger.error(error)
        IO.pure(PerformSarResponse(Failed, "", "", Some(error)))
    }
  }
}
