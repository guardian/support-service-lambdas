package com.gu.identityBackfill

import com.gu.identity.GetByEmail
import com.gu.identityBackfill.IdentityBackfillSteps.WireModel.IdentityBackfillRequest
import com.gu.identityBackfill.Types._
import com.gu.identityBackfill.salesforce.SalesforceAuthenticate.SalesforceAuth
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.Operation
import com.gu.util.apigateway.{ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.reader.Types._
import play.api.libs.json.{Json, Reads}
import scalaz.{-\/, \/, \/-}

object IdentityBackfillSteps extends Logging {

  object WireModel {

    case class IdentityBackfillRequest(
      emailAddress: String,
      dryRun: Boolean
    )
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
    sfAuth: () => FailableOp[SalesforceAuth], // we need to do this and we need it for the health check but it's not really a business step, TODO think about this more
    updateSalesforceIdentityId: SalesforceAuth => (SFContactId, IdentityId) => FailableOp[Unit]
  ): Operation = {

    def steps(apiGatewayRequest: ApiGatewayRequest) =
      for {
        request <- Json.parse(apiGatewayRequest.body).validate[IdentityBackfillRequest].toFailableOp.withLogging("zuora callout")
        emailAddress = fromRequest(request)
        identityId <- getByEmail(emailAddress).leftMap(a => ApiGatewayResponse.internalServerError(a.toString)).withLogging("GetByEmail")
        zuoraAccountsForEmail <- getZuoraAccountsForEmail(emailAddress)
        zuoraAccountForEmail <- zuoraAccountsForEmail match {
          case one :: Nil => \/-(one);
          case _ => -\/(ApiGatewayResponse.notFound("should have exactly one zuora account per email at this stage"))
        }
        _ <- zuoraAccountForEmail match {
          case zuoraAccount if zuoraAccount.identityId.isEmpty => \/-(());
          case _ => -\/(ApiGatewayResponse.notFound("the account we found was already populated with an identity id"))
        }
        zuoraAccountsForIdentityId <- countZuoraAccountsForIdentityId(identityId)
        _ <- if (zuoraAccountsForIdentityId == 0) \/-(()) else -\/(ApiGatewayResponse.notFound("already used that identity id"))
        _ <- (if (request.dryRun) -\/(ApiGatewayResponse.noActionRequired("DRY RUN requested! skipping to the end")) else \/-(())).withLogging("dryrun aborter")
        _ <- updateZuoraIdentityId(zuoraAccountForEmail.accountId, identityId)
        sfAuth <- sfAuth()
        _ <- updateSalesforceIdentityId(sfAuth)(zuoraAccountForEmail.sfContactId, identityId)
        // need to remember which ones we updated?
      } yield ()

    def healthcheck() =
      for {
        identityId <- getByEmail(EmailAddress("john.duffell@guardian.co.uk")).leftMap(a => ApiGatewayResponse.internalServerError(a.toString)).withLogging("healthcheck getByEmail")
        _ <- countZuoraAccountsForIdentityId(identityId)
        _ <- sfAuth()
      } yield ()

    Operation(steps = steps, healthcheck = () => healthcheck())
  }

}

