package com.gu.identityBackfill

import com.gu.identity.GetByEmail
import com.gu.identity.GetByEmail.{NotFound, NotValidated}
import com.gu.identityBackfill.PreReqCheck.PreReqResult
import com.gu.identityBackfill.Types.{IdentityId, _}
import com.gu.util.apigateway.ApiGatewayResponse
import org.scalatest.{FlatSpec, Matchers}
import scalaz.{-\/, \/-}

class PreReqCheckTest extends FlatSpec with Matchers {

  it should "go through a happy case" in {

    val result =
      PreReqCheck(
        email => \/-(IdentityId("asdf")),
        email => \/-(ZuoraAccountIdentitySFContact(AccountId("acc"), None, SFContactId("sf"))),
        identityId => \/-(()),
        _ => \/-(()),
        _ => \/-(())
      )(EmailAddress("email@address"))

    val expectedResult = \/-(PreReqResult(AccountId("acc"), SFContactId("sf"), IdentityId("asdf")))
    result should be(expectedResult)
  }

  it should "stop processing if it finds there is a zuora account already for the identity id" in {

    val result =
      PreReqCheck.noZuoraAccountsForIdentityId(countZuoraAccountsForIdentityId = \/-(1))

    val expectedResult = -\/(ApiGatewayResponse.notFound("already used that identity id"))
    result should be(expectedResult)
  }

  it should "stop processing if the zuora account for the given email already has an identity id" in {

    val result =
      PreReqCheck.getSingleZuoraAccountForEmail(
        \/-(List(ZuoraAccountIdentitySFContact(
          AccountId("acc"),
          Some(IdentityId("haha")),
          SFContactId("sf")
        )))
      )

    val expectedResult = -\/(ApiGatewayResponse.notFound("the account we found was already populated with an identity id"))
    result should be(expectedResult)
  }

  it should "stop processing if there are multiple zuora accounts with the same email address" in {

    val result =
      PreReqCheck.getSingleZuoraAccountForEmail({
        val contactWithoutIdentity = ZuoraAccountIdentitySFContact(AccountId("acc"), None, SFContactId("sf"))
        \/-(List(contactWithoutIdentity, contactWithoutIdentity))
      })

    val expectedResult = -\/(ApiGatewayResponse.notFound("should have exactly one zuora account per email at this stage"))
    result should be(expectedResult)
  }

  it should "stop processing if it can't find an identity id for the required email" in {

    val result = emailCheckFailure(NotFound)

    val expectedResult = -\/(ApiGatewayResponse.notFound("user doesn't have identity"))
    result should be(expectedResult)
  }

  it should "stop processing if it finds a non validated identity account" in {

    val result = emailCheckFailure(NotValidated)

    val expectedResult = -\/(ApiGatewayResponse.notFound("identity email not validated"))
    result should be(expectedResult)
  }

  private def emailCheckFailure(identityError: GetByEmail.ApiError) = {
    PreReqCheck(
      email => -\/(identityError),
      email => fail("shouldn't be called 1"),
      identityId => fail("shouldn't be called 2"),
      _ => fail("shouldn't be called 3"),
      _ => fail("shouldn't be called 4")
    )(EmailAddress("email@address"))
  }
}
