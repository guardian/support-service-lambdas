package com.gu.identityBackfill

import com.gu.identity.GetByEmail
import com.gu.identity.GetByEmail.{NotFound, NotValidated, OtherError}
import com.gu.identityBackfill.Types._
import com.gu.identityBackfill.zuora.GetZuoraSubTypeForAccount
import com.gu.identityBackfill.zuora.GetZuoraSubTypeForAccount.ReaderType.ReaderTypeValue
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.ApiGatewayOp._
import com.gu.util.reader.Types._
import com.gu.util.zuora.RestRequestMaker.ClientFailableOp
import scalaz.\/

object PreReqCheck {

  case class PreReqResult(zuoraAccountId: Types.AccountId, sFContactId: Types.SFContactId, requiredIdentityId: Types.IdentityId)

  def apply(
    getByEmail: EmailAddress => \/[GetByEmail.ApiError, IdentityId],
    getSingleZuoraAccountForEmail: EmailAddress => ApiGatewayOp[ZuoraAccountIdentitySFContact],
    noZuoraAccountsForIdentityId: IdentityId => ApiGatewayOp[Unit],
    zuoraSubType: AccountId => ApiGatewayOp[Unit],
    syncableSFToIdentity: SFContactId => ApiGatewayOp[Unit]
  )(emailAddress: EmailAddress): ApiGatewayOp[PreReqResult] = {
    for {
      identityId <- getByEmail(emailAddress).leftMap({
        case NotFound => ApiGatewayResponse.notFound("user doesn't have identity")
        case NotValidated => ApiGatewayResponse.notFound("identity email not validated")
        case OtherError(unknownError) => ApiGatewayResponse.internalServerError(unknownError)
      }).toApiGatewayOp.withLogging("GetByEmail")
      zuoraAccountForEmail <- getSingleZuoraAccountForEmail(emailAddress)
      _ <- noZuoraAccountsForIdentityId(identityId)
      _ <- syncableSFToIdentity(zuoraAccountForEmail.sfContactId)
    } yield PreReqResult(zuoraAccountForEmail.accountId, zuoraAccountForEmail.sfContactId, identityId)
  }

  def noZuoraAccountsForIdentityId(
    countZuoraAccountsForIdentityId: ClientFailableOp[Int]
  ): ApiGatewayOp[Unit] = {
    for {
      zuoraAccountsForIdentityId <- countZuoraAccountsForIdentityId.toApiGatewayOp("zuora issue")
      _ <- if (zuoraAccountsForIdentityId == 0) ContinueProcessing(()) else ReturnWithResponse(ApiGatewayResponse.notFound("already used that identity id"))
    } yield ()
  }

  def getSingleZuoraAccountForEmail(
    getZuoraAccountsForEmail: ClientFailableOp[List[ZuoraAccountIdentitySFContact]]
  ): ApiGatewayOp[ZuoraAccountIdentitySFContact] = {
    for {
      zuoraAccountsForEmail <- getZuoraAccountsForEmail.toApiGatewayOp("zuora issue")
      zuoraAccountForEmail <- zuoraAccountsForEmail match {
        case one :: Nil => ContinueProcessing(one);
        case _ => ReturnWithResponse(ApiGatewayResponse.notFound("should have exactly one zuora account per email at this stage"))
      }
      _ <- zuoraAccountForEmail match {
        case zuoraAccount if zuoraAccount.identityId.isEmpty => ContinueProcessing(());
        case _ => ReturnWithResponse(ApiGatewayResponse.notFound("the account we found was already populated with an identity id"))
      }
    } yield zuoraAccountForEmail
  }

  def acceptableReaderType(function: ClientFailableOp[List[GetZuoraSubTypeForAccount.ReaderType]]): ApiGatewayOp[Unit] = {
    for {
      readerTypes <- function.toApiGatewayOp("zuora issue")
      incorrectReaderTypes = readerTypes.collect {
        case ReaderTypeValue(readerType) if readerType != "Direct" => readerType // it's bad
      }
      _ <- if (incorrectReaderTypes.isEmpty)
        ContinueProcessing(())
      else
        ReturnWithResponse(ApiGatewayResponse.notFound(s"had an incorrect reader type(s): ${incorrectReaderTypes.mkString(",")}"))
    } yield ()
  }

}
