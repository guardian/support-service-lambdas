package com.gu.identityBackfill

import com.gu.identity.GetByEmail
import com.gu.identity.GetByEmail.IdentityAccount
import com.gu.identityBackfill.PreReqCheck.PreReqResult
import com.gu.identityBackfill.Types._
import com.gu.identityBackfill.salesforce.UpdateSalesforceIdentityId.IdentityId
import com.gu.identityBackfill.zuora.GetZuoraSubTypeForAccount.ReaderType
import com.gu.salesforce.TypesForSFEffectsData.{SFAccountId, SFContactId}
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class PreReqCheckTest extends AnyFlatSpec with Matchers {

  val personContact = SFContactId("sf")

  val salesforceResult = Some(personContact)

  val zuoraResult = List(
    ZuoraAccountIdentitySFContact(AccountId("acc"), None, personContact, CrmId("crmId")), // customer's direct sub
    ZuoraAccountIdentitySFContact(
      AccountId("acc2"),
      None,
      SFContactId("sf2"),
      CrmId("crmId"),
    ), // same customer's gift sub
  )

  it should "go through a happy case" in {
    val result =
      PreReqCheck(
        _ => ContinueProcessing(Some(IdentityId("asdf"))),
        _ => ContinueProcessing(zuoraResult),
        _ => ContinueProcessing(()),
        _ => ContinueProcessing(()),
        _ => ContinueProcessing(salesforceResult),
      )(EmailAddress("email@address"))

    val expectedResult = ContinueProcessing(
      PreReqResult(
        Set(AccountId("acc"), AccountId("acc2")),
        Some(personContact),
        Some(IdentityId("asdf")),
      ),
    )

    result should be(expectedResult)
  }

  it should "go through a happy case with no existing identity" in {

    val result =
      PreReqCheck(
        _ => ContinueProcessing(None),
        _ => ContinueProcessing(zuoraResult),
        _ => ContinueProcessing(()),
        _ => ContinueProcessing(()),
        _ => ContinueProcessing(salesforceResult),
      )(EmailAddress("email@address"))

    val expectedResult = ContinueProcessing(
      PreReqResult(
        Set(AccountId("acc"), AccountId("acc2")),
        Some(personContact),
        None,
      ),
    )

    result should be(expectedResult)
  }

  it should "stop processing if it finds there is a zuora account already for the identity id" in {

    val result =
      PreReqCheck.noZuoraAccountsForIdentityId(countZuoraAccountsForIdentityId = ClientSuccess(1))

    val expectedResult = ReturnWithResponse(ApiGatewayResponse.notFound("already used that identity id"))
    result should be(expectedResult)
  }

  "checkSfContactsSyncable" should "ReturnWithResponse if contacts not syncable" in {
    val errorResponse = ApiGatewayResponse.badRequest("foo")
    val ReturnWithResponse(result) = PreReqCheck
      .checkSfContactsSyncable(_ => ReturnWithResponse(errorResponse))(Set(SFAccountId("crmId")))

    result.body should include("Bad request: foo")
    result shouldNot be(errorResponse)
    result.body should include("is not syncable for the following reasons:")
  }

  "checkSfContactsSyncable" should "ReturnWithResponse if more than one CRM account" in {
    val errorResponse = ApiGatewayResponse.badRequest("foo")
    val ReturnWithResponse(result) = PreReqCheck
      .checkSfContactsSyncable(_ => ReturnWithResponse(errorResponse))(
        Set(SFAccountId("crmId1"), SFAccountId("crmId2")),
      )
    result.body should include("more than one CRM account")
    result.body shouldNot include("foo")
  }

  "checkSfContactsSyncable" should "continue processing if syncable" in {
    val ContinueProcessing(result) = PreReqCheck
      .checkSfContactsSyncable(_ => ContinueProcessing(salesforceResult))(Set(SFAccountId("crmId")))
    result shouldBe salesforceResult
  }

  "validateZuoraAccountsFound" should "stop processing if the zuora account for the given email already has an identity id" in {

    val ReturnWithResponse(result) = PreReqCheck.validateZuoraAccountsFound(
      ClientSuccess(
        List(
          ZuoraAccountIdentitySFContact(
            AccountId("acc"),
            Some(IdentityId("haha")),
            SFContactId("sf"),
            CrmId("asf"),
          ),
        ),
      ),
    )(EmailAddress("email@gu.com"))

    result.statusCode shouldBe "400"
    result.body should include("identity ids found in zuora")

  }

  "validateZuoraAccountsFound" should "stop processing if multiple crm ids are found" in {

    val ReturnWithResponse(result) = PreReqCheck.validateZuoraAccountsFound(
      ClientSuccess(
        List(
          ZuoraAccountIdentitySFContact(
            AccountId("acc"),
            None,
            SFContactId("sf"),
            CrmId("CrmId"),
          ),
          ZuoraAccountIdentitySFContact(
            AccountId("acc2"),
            None,
            SFContactId("sf2"),
            CrmId("CrmId2"),
          ),
        ),
      ),
    )(EmailAddress("email@gu.com"))

    result.statusCode shouldBe "400"
    result.body should include("multiple CRM ids found for")

  }

  "validateZuoraAccountsFound" should "stop processing if no zuora accounts found" in {

    val ReturnWithResponse(result) =
      PreReqCheck.validateZuoraAccountsFound(ClientSuccess(Nil))(EmailAddress("email@gu.com"))

    result.statusCode shouldBe "400"
    result.body should include("no zuora accounts found for")

  }

  it should "stop processing if it finds a non validated identity account" in {

    val result = emailCheckFailure(ClientSuccess(IdentityAccount(IdentityId("asdf"), isUserEmailValidated = false)))

    val expectedResult = ReturnWithResponse(ApiGatewayResponse.internalServerError("identity error"))
    result should be(expectedResult)
  }

  private def emailCheckFailure(identityError: ClientFailableOp[GetByEmail.IdentityAccount]) = {
    PreReqCheck(
      _ => ReturnWithResponse(ApiGatewayResponse.internalServerError("identity error")),
      email => fail("shouldn't be called 1"),
      identityId => fail("shouldn't be called 2"),
      _ => fail("shouldn't be called 3"),
      _ => fail("shouldn't be called 4"),
    )(EmailAddress("email@address"))
  }

  // allow contain either blank or direct, but nothign else
  "acceptable reader type" should "allow blank" in {
    val readerTypes = List(ReaderType.NoReaderType)
    PreReqCheck.acceptableReaderType(ClientSuccess(readerTypes)) should be(ContinueProcessing(()))
  }

  "acceptable reader type" should "allow direct" in {
    val readerTypes = List(ReaderType.ReaderTypeValue("Direct"))
    PreReqCheck.acceptableReaderType(ClientSuccess(readerTypes)) should be(ContinueProcessing(()))
  }

  "acceptable reader type" should "allow multiple valid" in {
    val readerTypes = List(ReaderType.ReaderTypeValue("Direct"), ReaderType.ReaderTypeValue("Direct"))
    PreReqCheck.acceptableReaderType(ClientSuccess(readerTypes)) should be(ContinueProcessing(()))
  }

  "acceptable reader type" should "not allow agent" in {
    val readerTypes = List(ReaderType.ReaderTypeValue("Agent"))
    PreReqCheck.acceptableReaderType(ClientSuccess(readerTypes)).toDisjunction.left.map(_.statusCode) should be(
      Left("404"),
    )
  }

  "acceptable reader type" should "not allow gift" in {
    val readerTypes = List(ReaderType.ReaderTypeValue("Gift"))
    PreReqCheck.acceptableReaderType(ClientSuccess(readerTypes)).toDisjunction.left.map(_.statusCode) should be(
      Left("404"),
    )
  }

  "acceptable reader type" should "not allow a combination of valid and invalid" in {
    val readerTypes = List(ReaderType.ReaderTypeValue("Direct"), ReaderType.ReaderTypeValue("Gift"))
    PreReqCheck.acceptableReaderType(ClientSuccess(readerTypes)).toDisjunction.left.map(_.statusCode) should be(
      Left("404"),
    )
  }
}
