package com.gu.identityBackfill

import com.gu.identity.{GetByEmail, GetByIdentityId}
import com.gu.identity.GetByEmail.IdentityAccountWithUnvalidatedEmail
import com.gu.identity.GetByIdentityId.IdentityUser
import com.gu.identityBackfill.TypeConvert._
import com.gu.identityBackfill.Types._
import com.gu.identityBackfill.salesforce.UpdateSalesforceIdentityId.IdentityId
import com.gu.identityBackfill.zuora.GetZuoraSubTypeForAccount
import com.gu.identityBackfill.zuora.GetZuoraSubTypeForAccount.ReaderType.ReaderTypeValue
import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.ApiGatewayOp._
import com.gu.util.reader.Types._
import com.gu.util.resthttp.LazyClientFailableOp
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientFailure, ClientSuccess, NotFound}

object PreReqCheck {

  case class PreReqResult(zuoraAccountId: Types.AccountId, sFContactId: SFContactId, existingIdentityId: Option[IdentityId])

  def apply(
    getByEmail: EmailAddress => ClientFailableOp[GetByEmail.IdentityAccount],
    getByIdentityId: IdentityId => ClientFailableOp[GetByIdentityId.IdentityUser],
    getSingleZuoraAccountForEmail: EmailAddress => ApiGatewayOp[ZuoraAccountIdentitySFContact],
    noZuoraAccountsForIdentityId: IdentityId => ApiGatewayOp[Unit],
    zuoraSubType: AccountId => ApiGatewayOp[Unit],
    syncableSFToIdentity: SFContactId => LazyClientFailableOp[ApiGatewayOp[Unit]]
  )(emailAddress: EmailAddress): ApiGatewayOp[PreReqResult] = {
    for {
      maybeExistingIdentityId <- findExistingIdentityId(getByEmail, getByIdentityId, emailAddress)
      zuoraAccountForEmail <- getSingleZuoraAccountForEmail(emailAddress)
      _ <- maybeExistingIdentityId.map(noZuoraAccountsForIdentityId).getOrElse(ContinueProcessing(()))
      _ <- syncableSFToIdentity(zuoraAccountForEmail.sfContactId).value.toApiGatewayOp("load SF contact").flatMap(identity)
    } yield PreReqResult(zuoraAccountForEmail.accountId, zuoraAccountForEmail.sfContactId, maybeExistingIdentityId)
  }

  def findExistingIdentityId(
    getByEmail: EmailAddress => ClientFailableOp[GetByEmail.IdentityAccount],
    getByIdentityId: IdentityId => ClientFailableOp[GetByIdentityId.IdentityUser],
    emailAddress: EmailAddress
  ): ApiGatewayOp[Option[IdentityId]] = {

    def continueIfNoPassword(identityId: IdentityId) = {
      getByIdentityId(identityId) match {
        case ClientSuccess(IdentityUser(_, false)) => ContinueProcessing(Some(identityId))
        case _ => ReturnWithResponse(ApiGatewayResponse.notFound(s"identity email not validated but password is set $identityId"))
      }
    }

    val result = getByEmail(emailAddress) match {
      case ClientSuccess(GetByEmail.IdentityAccountWithValidatedEmail(identityId)) => ContinueProcessing(Some(identityId))
      case ClientSuccess(IdentityAccountWithUnvalidatedEmail(identityId)) => continueIfNoPassword(identityId)
      case NotFound(_) => ContinueProcessing(None)
      case other: ClientFailure => ReturnWithResponse(ApiGatewayResponse.internalServerError(other.toString))
    }

    result.withLogging("GetByEmail")
  }

  def noZuoraAccountsForIdentityId(
    countZuoraAccountsForIdentityId: ClientFailableOp[Int]
  ): ApiGatewayOp[Unit] = {
    for {
      zuoraAccountsForIdentityId <- countZuoraAccountsForIdentityId.toApiGatewayOp("count zuora accounts for identity id")
      _ <- (zuoraAccountsForIdentityId == 0)
        .toApiGatewayContinueProcessing(ApiGatewayResponse.notFound("already used that identity id"))
    } yield ()
  }

  def getSingleZuoraAccountForEmail(
    getZuoraAccountsForEmail: ClientFailableOp[List[ZuoraAccountIdentitySFContact]]
  ): ApiGatewayOp[ZuoraAccountIdentitySFContact] = {
    for {
      zuoraAccountsForEmail <- getZuoraAccountsForEmail.toApiGatewayOp("get zuora accounts for email address")
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

  def acceptableReaderType(readerTypes: ClientFailableOp[List[GetZuoraSubTypeForAccount.ReaderType]]): ApiGatewayOp[Unit] = {
    for {
      readerTypes <- readerTypes.toApiGatewayOp("checking acceptable reader type in zuora")
      incorrectReaderTypes = readerTypes.collect {
        case ReaderTypeValue(readerType) if readerType != "Direct" => readerType // it's bad
      }
      _ <- incorrectReaderTypes.isEmpty
        .toApiGatewayContinueProcessing(ApiGatewayResponse.notFound(s"had an incorrect reader type(s): ${incorrectReaderTypes.mkString(",")}"))
    } yield ()
  }

}
