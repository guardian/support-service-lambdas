package com.gu.zuora.rer

import cats.effect.IO
import BatonModels.{Completed, Failed, PerformRerRequest, PerformRerResponse, RerRequest, RerResponse}
import com.typesafe.scalalogging.LazyLogging
import cats.syntax.traverse._

case class ZuoraPerformRerHandler(zuoraHelper: ZuoraRer, s3Service: S3Service, zuoraRerConfig: ZuoraRerConfig)
  extends LazyLogging
  with ZuoraHandler[RerRequest, RerResponse] {

  def scrubAccounts(contacts: List[ZuoraContact]): Either[ZuoraRerError, List[Unit]] =
    contacts.traverse { contact =>
      for {
        _ <- zuoraHelper.scrubAccount(contact)
      } yield ()
    }

  def verifyErasure(contacts: List[ZuoraContact]): Either[ZuoraRerError, List[Unit]] =
    contacts.traverse { contact =>
      for {
        _ <- zuoraHelper.verifyErasure(contact)
      } yield ()
    }

//  def processAccountDetails(contacts: List[ZuoraContact], initiationReference: String): Either[ZuoraRerError, List[InvoiceIds]] =
//    contacts.traverse { contact =>
//      for {
//        zuoraAccountSuccess <- zuoraHelper.accountResponse(contact)
//        _ <- s3Service.writeSuccessAccountResult(initiationReference, zuoraAccountSuccess, zuoraRerConfig)
//      } yield zuoraAccountSuccess.invoiceList
//    }
//
//  def processInvoicesForContacts(allContactInvoices: List[InvoiceIds], initiationReference: String): Either[ZuoraRerError, List[Unit]] =
//    allContactInvoices.traverse { accountInvoices =>
//      for {
//        downloadStreams <- zuoraHelper.invoicesResponse(accountInvoices.invoices)
//        _ <- s3Service.writeSuccessInvoiceResult(initiationReference, downloadStreams, zuoraRerConfig)
//      } yield ()
//    }

  def initiateRer(
    request: PerformRerRequest
  ): Either[ZuoraRerError, Unit] = {
    zuoraHelper.zuoraContactsWithEmail(request.subjectEmail).toDisjunction match {
      case Left(err) =>
        logger.error("Failed to perform subject access request to Zuora.")
        Left(ZuoraClientError(err.message))
      case Right(contactList) =>
        logger.info(s"Found ${contactList.length} account(s) with id's: ${contactList.map(_.AccountId).mkString(", ")}")
        for {
          _ <- verifyErasure(contactList)
          _ <- scrubAccounts(contactList)
          //                invoiceIds <- processAccountDetails(contactList, request.initiationReference)
          //                _ <- processInvoicesForContacts(invoiceIds, request.initiationReference)
          _ <- s3Service.copyResultsToCompleted(request.initiationReference, zuoraRerConfig)
        } yield Right(())
    }
  }

  override def handle(
    request: RerRequest
  ): IO[RerResponse] = {
    request match {
      case r: PerformRerRequest =>
        val res = initiateRer(r)
        res match {
          case Left(err) =>
            s3Service.writeFailedResult(r.initiationReference, err, zuoraRerConfig)
            IO.pure(PerformRerResponse(r.initiationReference, err.toString, Failed, r.subjectEmail))
          case Right(_) => IO.pure(PerformRerResponse(r.initiationReference, "Success", Completed, r.subjectEmail))
        }
      case _ =>
        val error = "Unable to retrieve email and initiation reference from request"
        logger.error(error)
        IO.pure(PerformRerResponse("", error, Failed, ""))
    }
  }
}
