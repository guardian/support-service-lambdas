package com.gu.identityBackfill

import com.gu.identityBackfill.StepsData._
import com.gu.identityBackfill.Types.{IdentityId, _}
import com.gu.util.apigateway.{ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.reader.Types.FailableOp
import org.scalatest.{FlatSpec, Matchers}
import scalaz.{-\/, \/-}

class StepsTest extends FlatSpec with Matchers {

  class StepsWithMocks {

    var zuoraUpdate: Option[(AccountId, IdentityId)] = None // !!
    var salesforceUpdate: Option[(SFContactId, IdentityId)] = None // !!
    var emailToCheck: Option[EmailAddress] = None // !!

    def getSteps(succeed: Boolean = true): ApiGatewayRequest => FailableOp[Unit] = {
      val preReqCheck: EmailAddress => FailableOp[PreReqCheck.PreReqResult] = { email =>
        emailToCheck = Some(email)
        if (succeed)
          \/-(PreReqCheck.PreReqResult(AccountId("acc"), SFContactId("sf"), IdentityId("asdf")))
        else
          -\/(ApiGatewayResponse.notFound("dummy"))
      }
      IdentityBackfillSteps(
        preReqCheck,
        updateZuoraIdentityId = (accountId, identityId) => {
          zuoraUpdate = Some((accountId, identityId))
          \/-(())
        },
        updateSalesforceIdentityId = (sFContactId, identityId) => {
          salesforceUpdate = Some((sFContactId, identityId))
          \/-(())
        }
      )
    }

  }

  it should "go through a happy case in real mode" in {

    val stepsWithMocks = new StepsWithMocks
    import stepsWithMocks._

    val result =
      getSteps()(ApiGatewayRequest(None, Some(identityBackfillRequest(false)), None))

    val expectedResult = \/-(())
    result should be(expectedResult)
    zuoraUpdate should be(Some((AccountId("acc"), IdentityId("asdf"))))
    salesforceUpdate should be(Some((SFContactId("sf"), IdentityId("asdf"))))
    emailToCheck should be(Some(EmailAddress("email@address")))
  }

  it should "go through a happy case in dry run mode without calling update" in {

    val stepsWithMocks = new StepsWithMocks
    import stepsWithMocks._

    val result =
      getSteps()(ApiGatewayRequest(None, Some(identityBackfillRequest(true)), None))

    val expectedResult = -\/(ApiGatewayResponse.noActionRequired("DRY RUN requested! skipping to the end"))
    result should be(expectedResult)
    zuoraUpdate should be(None)
    salesforceUpdate should be(None)
    emailToCheck should be(Some(EmailAddress("email@address")))
  }

  it should "go through a already got identity (according to the zuora query bu identity id) case without calling update even not in dry run mode" in {

    val stepsWithMocks = new StepsWithMocks
    import stepsWithMocks._

    val result =
      getSteps(false)(ApiGatewayRequest(None, Some(identityBackfillRequest(false)), None))

    val expectedResult = -\/(ApiGatewayResponse.notFound("dummy"))
    result should be(expectedResult)
    zuoraUpdate should be(None)
    salesforceUpdate should be(None)
  }

}

object StepsData {

  def identityBackfillRequest(dryRun: Boolean): String =
    s"""{"emailAddress": "email@address", "dryRun": $dryRun}""""

}
