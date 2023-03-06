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

  def initiateRer(request: PerformRerRequest): Either[ZuoraRerError, String] = {
    zuoraHelper.zuoraContactsWithEmail(request.subjectEmail).toDisjunction match {
      case Left(err) =>
        logger.error("Failed to request contact account ids from Zuora.")
        Left(ZuoraClientError(err.message))
      case Right(contactList) =>
        val accountIds = contactList.map(_.AccountId).mkString(", ")
        logger.info(s"Found ${contactList.length} account(s) with id's: $accountIds")
        for {
          _ <- verifyErasure(contactList)
          _ <- scrubAccounts(contactList)
          _ <- s3Service.copyResultsToCompleted(request.initiationReference, contactList, zuoraRerConfig)
        } yield
          if (contactList.length > 0) s"Successfully scrubbed account(s): $accountIds"
          else "No accounts found with requested subject email"
    }
  }

  override def handle(
      request: RerRequest,
  ): IO[RerResponse] = {
    request match {
      case r: PerformRerRequest =>
        val res = initiateRer(r)
        res match {
          case Left(err) =>
            s3Service.writeFailedResult(r.initiationReference, err, zuoraRerConfig)
            IO.pure(PerformRerResponse(r.initiationReference, err.toString, Failed, r.subjectEmail))
          case Right(message) => IO.pure(PerformRerResponse(r.initiationReference, message, Completed, r.subjectEmail))
        }
      case _ =>
        val error = "Unable to retrieve email and initiation reference from request"
        logger.error(error)
        IO.pure(PerformRerResponse("", error, Failed, ""))
    }
  }
}
