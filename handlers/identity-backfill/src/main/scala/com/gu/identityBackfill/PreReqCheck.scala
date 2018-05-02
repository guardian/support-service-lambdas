package com.gu.identityBackfill

import com.gu.identity.GetByEmail
import com.gu.identity.GetByEmail.{NotFound, NotValidated, OtherError}
import com.gu.identityBackfill.ResponseMaker._
import com.gu.identityBackfill.Types._
import com.gu.identityBackfill.zuora.GetZuoraSubTypeForAccount
import com.gu.identityBackfill.zuora.GetZuoraSubTypeForAccount.ReaderType.{NoReaderType, ReaderTypeValue}
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types._
import com.gu.util.zuora.RestRequestMaker.ClientFailableOp
import scalaz.std.list._
import scalaz.syntax.traverse._
import scalaz.{-\/, \/, \/-}

object PreReqCheck {

  case class PreReqResult(zuoraAccountId: Types.AccountId, sFContactId: Types.SFContactId, requiredIdentityId: Types.IdentityId)

  def apply(
    getByEmail: EmailAddress => \/[GetByEmail.ApiError, IdentityId],
    getSingleZuoraAccountForEmail: EmailAddress => FailableOp[ZuoraAccountIdentitySFContact],
    noZuoraAccountsForIdentityId: IdentityId => FailableOp[Unit],
    zuoraSubType: AccountId => FailableOp[Unit],
    syncableSFToIdentity: SFContactId => FailableOp[Unit]
  )(emailAddress: EmailAddress): FailableOp[PreReqResult] = {
    for {
      identityId <- getByEmail(emailAddress).leftMap({
        case NotFound => ApiGatewayResponse.notFound("user doesn't have identity")
        case NotValidated => ApiGatewayResponse.notFound("identity email not validated")
        case OtherError(unknownError) => ApiGatewayResponse.internalServerError(unknownError)
      }).withLogging("GetByEmail")
      zuoraAccountForEmail <- getSingleZuoraAccountForEmail(emailAddress)
      _ <- noZuoraAccountsForIdentityId(identityId)
      _ <- syncableSFToIdentity(zuoraAccountForEmail.sfContactId)
    } yield PreReqResult(zuoraAccountForEmail.accountId, zuoraAccountForEmail.sfContactId, identityId)
  }

  def noZuoraAccountsForIdentityId(
    countZuoraAccountsForIdentityId: ClientFailableOp[Int]
  ): FailableOp[Unit] = {
    for {
      zuoraAccountsForIdentityId <- countZuoraAccountsForIdentityId.nonSuccessToError
      _ <- if (zuoraAccountsForIdentityId == 0) \/-(()) else -\/(ApiGatewayResponse.notFound("already used that identity id"))
    } yield ()
  }

  def getSingleZuoraAccountForEmail(
    getZuoraAccountsForEmail: ClientFailableOp[List[ZuoraAccountIdentitySFContact]]
  ): FailableOp[ZuoraAccountIdentitySFContact] = {
    for {
      zuoraAccountsForEmail <- getZuoraAccountsForEmail.nonSuccessToError
      zuoraAccountForEmail <- zuoraAccountsForEmail match {
        case one :: Nil => \/-(one);
        case _ => -\/(ApiGatewayResponse.notFound("should have exactly one zuora account per email at this stage"))
      }
      _ <- zuoraAccountForEmail match {
        case zuoraAccount if zuoraAccount.identityId.isEmpty => \/-(());
        case _ => -\/(ApiGatewayResponse.notFound("the account we found was already populated with an identity id"))
      }
    } yield zuoraAccountForEmail
  }

  def acceptableReaderType(function: ClientFailableOp[List[GetZuoraSubTypeForAccount.ReaderType]]): FailableOp[Unit] = {
    for {
      readerTypes <- function.nonSuccessToError
      _ <- readerTypes.traverseU {
        case NoReaderType => \/-(())
        case ReaderTypeValue("Direct") => \/-(())
        case ReaderTypeValue(readerType) => -\/(ApiGatewayResponse.notFound(s"had a reader type: $readerType")) // it's bad
      }.map { _: List[Unit] => () }

    } yield ()
  }

}
