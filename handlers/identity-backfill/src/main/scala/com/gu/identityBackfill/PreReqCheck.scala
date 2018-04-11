package com.gu.identityBackfill

import com.gu.identity.GetByEmail
import com.gu.identity.GetByEmail.NotFound
import com.gu.identityBackfill.Types.{EmailAddress, IdentityId, SFContactId, ZuoraAccountIdentitySFContact}
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types._
import scalaz.{-\/, \/, \/-}

object PreReqCheck {

  case class PreReqResult(zuoraAccountId: Types.AccountId, sFContactId: Types.SFContactId, requiredIdentityId: Types.IdentityId)

  def apply(
    getByEmail: EmailAddress => \/[GetByEmail.ApiError, IdentityId],
    getSingleZuoraAccountForEmail: EmailAddress => FailableOp[ZuoraAccountIdentitySFContact],
    noZuoraAccountsForIdentityId: IdentityId => FailableOp[Unit],
    syncableSFToIdentity: SFContactId => FailableOp[Unit]
  )(emailAddress: EmailAddress) = {
    for {
      identityId <- getByEmail(emailAddress).leftMap({
        case NotFound => ApiGatewayResponse.notFound("user doesn't have identity")
        case a => ApiGatewayResponse.internalServerError(a.toString)
      }).withLogging("GetByEmail")
      zuoraAccountForEmail <- getSingleZuoraAccountForEmail(emailAddress)
      _ <- noZuoraAccountsForIdentityId(identityId)
      _ <- syncableSFToIdentity(zuoraAccountForEmail.sfContactId)
    } yield PreReqResult(zuoraAccountForEmail.accountId, zuoraAccountForEmail.sfContactId, identityId)
  }

  def noZuoraAccountsForIdentityId(
    countZuoraAccountsForIdentityId: IdentityId => FailableOp[Int]
  )(identityId: IdentityId) = {
    for {
      zuoraAccountsForIdentityId <- countZuoraAccountsForIdentityId(identityId)
      _ <- if (zuoraAccountsForIdentityId == 0) \/-(()) else -\/(ApiGatewayResponse.notFound("already used that identity id"))
    } yield ()
  }

  def getSingleZuoraAccountForEmail(
    getZuoraAccountsForEmail: EmailAddress => FailableOp[List[ZuoraAccountIdentitySFContact]]
  )(emailAddress: EmailAddress) = {
    for {
      zuoraAccountsForEmail <- getZuoraAccountsForEmail(emailAddress)
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

}
