package com.gu.identityBackfill

import com.gu.identity.GetByEmail
import com.gu.identityBackfill.IdentityBackfillSteps.WireModel.IdentityBackfillRequest
import com.gu.identityBackfill.Types._
import com.gu.util.Logging
import com.gu.util.apigateway.{ ApiGatewayRequest, ApiGatewayResponse }
import com.gu.util.reader.Types._
import play.api.libs.json.{ Json, Reads }

import scalaz.{ -\/, \/, \/- }

object IdentityBackfillSteps extends Logging {

  object WireModel {

    case class IdentityBackfillRequest(
      emailAddress: String,
      dryRun: Boolean)
    implicit val identityBackfillRequest: Reads[IdentityBackfillRequest] = Json.reads[IdentityBackfillRequest]

  }

  def fromRequest(identityBackfillRequest: IdentityBackfillRequest): EmailAddress = {
    EmailAddress(identityBackfillRequest.emailAddress)
  }

  def apply(
    getByEmail: EmailAddress => \/[GetByEmail.ApiError, IdentityId],
    getZuoraAccountsForEmail: EmailAddress => FailableOp[List[ZuoraAccountIdentitySFContact]],
    countZuoraAccountsForIdentityId: IdentityId => FailableOp[Int],
    updateZuoraIdentityId: (AccountId, IdentityId) => FailableOp[Unit],
    updateSalesforceIdentityId: (SFContactId, IdentityId) => FailableOp[Unit])(apiGatewayRequest: ApiGatewayRequest): FailableOp[Unit] = {
    for {
      request <- Json.fromJson[IdentityBackfillRequest](Json.parse(apiGatewayRequest.body)).toFailableOp.withLogging("zuora callout")
      emailAddress = fromRequest(request)
      identityId <- getByEmail(emailAddress).leftMap(a => ApiGatewayResponse.internalServerError(a.toString)).withLogging("GetByEmail")
      _ <- if (request.dryRun) -\/(ApiGatewayResponse.noActionRequired("DRY RUN requested! skipping to the end")) else \/-(()) // FIXME remove this like
      zuoraAccountsForEmail <- getZuoraAccountsForEmail(emailAddress)
      zuoraAccountForEmail <- zuoraAccountsForEmail match { case one :: Nil => \/-(one); case _ => -\/(ApiGatewayResponse.internalServerError("should have exactly one zuora account per email at this stage")) }
      zuoraAccountsForIdentityId <- countZuoraAccountsForIdentityId(identityId)
      _ <- if (zuoraAccountsForIdentityId > 0) \/-(()) else -\/(ApiGatewayResponse.internalServerError("already used that identity id"))
      _ <- if (request.dryRun) -\/(ApiGatewayResponse.noActionRequired("DRY RUN requested! skipping to the end")) else \/-(())
      _ <- updateZuoraIdentityId(zuoraAccountForEmail.accountId, identityId)
      _ <- updateSalesforceIdentityId(zuoraAccountForEmail.sfContactId, identityId)
      // need to remember which ones we updated?
    } yield ()
  }

}

object Types {

  case class EmailAddress(value: String)
  case class IdentityId(value: String)
  case class SFContactId(value: String)
  case class AccountId(value: String)

  case class ZuoraAccountIdentitySFContact(
    accountId: AccountId,
    identityId: IdentityId,
    sfContactId: SFContactId)

}