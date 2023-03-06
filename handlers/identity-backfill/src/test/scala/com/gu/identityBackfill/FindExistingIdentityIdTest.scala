package com.gu.identityBackfill

import com.gu.identity.GetByEmail.IdentityAccount
import com.gu.identity.GetByIdentityId.IdentityUser
import com.gu.identityBackfill.Types.EmailAddress
import com.gu.identityBackfill.salesforce.UpdateSalesforceIdentityId.IdentityId
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import com.gu.util.resthttp.Types.{ClientSuccess, GenericError, NotFound}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class FindExistingIdentityIdTest extends AnyFlatSpec with Matchers {
  "findExistingIdentityId" should "continue processing with identity id for existing validated account" in {
    FindExistingIdentityId(
      _ => ClientSuccess(IdentityAccount(IdentityId("100"), isUserEmailValidated = true)),
      _ => fail("Should not be called"),
    )(EmailAddress("email@email.email")) should be(ContinueProcessing(Some(IdentityId("100"))))
  }

  "findExistingIdentityId" should "continue processing with identity id for existing unvalidated account with no password" in {
    FindExistingIdentityId(
      _ => ClientSuccess(IdentityAccount(IdentityId("100"), isUserEmailValidated = false)),
      _ => ClientSuccess(IdentityUser(IdentityId("100"), hasPassword = false)),
    )(EmailAddress("email@email.email")) should be(ContinueProcessing(Some(IdentityId("100"))))
  }

  "findExistingIdentityId" should "continue processing for not found identity user" in {
    FindExistingIdentityId(
      _ => NotFound("not found"),
      _ => fail("should not be called"),
    )(EmailAddress("email@email.email")) should be(ContinueProcessing(None))
  }

  "findExistingIdentityId" should "ReturnWithResponse for unvalidated account with password" in {
    FindExistingIdentityId(
      _ => ClientSuccess(IdentityAccount(IdentityId("100"), isUserEmailValidated = false)),
      _ => ClientSuccess(IdentityUser(IdentityId("100"), hasPassword = true)),
    )(EmailAddress("email@email.email")) should be(
      ReturnWithResponse(ApiGatewayResponse.notFound(s"Identity account not validated but password is set: 100")),
    )
  }

  "findExistingIdentityId" should "ReturnWithResponse for unexpected identity response" in {
    FindExistingIdentityId(
      _ => GenericError("error"),
      _ => fail("should not be called"),
    )(EmailAddress("email@email.email")) should be(ReturnWithResponse(ApiGatewayResponse.internalServerError("error")))
  }

  "findExistingIdentityId" should "ReturnWithResponse for unexpected identity response for get by id" in {
    FindExistingIdentityId(
      _ => ClientSuccess(IdentityAccount(IdentityId("100"), isUserEmailValidated = false)),
      _ => GenericError("error"),
    )(EmailAddress("email@email.email")) should be(
      ReturnWithResponse(ApiGatewayResponse.notFound(s"Identity account not validated but password is set: 100")),
    )
  }
}
