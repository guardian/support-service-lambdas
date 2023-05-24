import com.gu.soft_opt_in_consent_setter.HandlerIAP._
import com.gu.soft_opt_in_consent_setter.models.{SFAssociatedSubRecord, SFAssociatedSubResponse, SoftOptInError}
import com.gu.soft_opt_in_consent_setter.testData.ConsentsCalculatorTestData.testConsentMappings
import com.gu.soft_opt_in_consent_setter.{ConsentsCalculator, MobileSubscription, MobileSubscriptions, SalesforceConnector}
import org.scalamock.scalatest.MockFactory
import org.scalatest.funsuite.AnyFunSuite
import org.scalatest.matchers.should.Matchers

// higher level tests on the 'processProductSwitch', 'processAcquisition' and 'processCancellation' functions.

class HandlerTests extends AnyFunSuite with Matchers with MockFactory {

  val calculator = new ConsentsCalculator(testConsentMappings)
  val mockSendConsentsReq = mockFunction[String, String, Either[SoftOptInError, Unit]]
  val mockGetMobileSubscriptions = mockFunction[String, Either[SoftOptInError, MobileSubscriptions]]
  val mockSfConnector = mock[SalesforceConnector]

  val identityId = "someIdentityId"
  val subscriptionNumber = "A-S12345678"

  test(testName = "processProductSwitchSub should handle product switch event correctly") {
    val mobileSubscriptions = MobileSubscriptions(
      List(
        MobileSubscription(true),
      ),
    )

    mockSendConsentsReq
      .expects(
        identityId,
        "[\n  {\n    \"id\" : \"digital_subscriber_preview\",\n    \"consented\" : true\n  }\n]",
      )
      .returning(Right(()))
    mockGetMobileSubscriptions.expects("someIdentityId").returning(Right(mobileSubscriptions))
    mockSfConnector.getActiveSubs _ expects Seq("someIdentityId") returning Right(
      SFAssociatedSubResponse(
        1,
        true,
        records = Seq(
          SFAssociatedSubRecord(
            "contributions",
            identityId,
          ),
        ),
      ),
    )

    val testMessageBody = MessageBody(
      identityId = "someIdentityId",
      productName = "supporterPlus",
      previousProductName = Some("contributions"),
      eventType = Switch,
      subscriptionNumber = "A-S12345678",
    )

    val result = processProductSwitchSub(
      testMessageBody,
      mockSendConsentsReq,
      mockGetMobileSubscriptions,
      calculator,
      mockSfConnector,
    )

    result shouldBe Right(())
  }

  test(testName = "processAcquiredSub should handle acquisition event correctly") {
    val mobileSubscriptions = MobileSubscriptions(
      List(
        MobileSubscription(true),
      ),
    )

    mockSendConsentsReq
      .expects(
        "someIdentityId",
        "[\n  {\n    \"id\" : \"your_support_onboarding\",\n    \"consented\" : true\n  },\n  {\n    \"id\" : \"similar_guardian_products\",\n    \"consented\" : true\n  },\n  {\n    \"id\" : \"supporter_newsletter\",\n    \"consented\" : true\n  },\n  {\n    \"id\" : \"digital_subscriber_preview\",\n    \"consented\" : true\n  }\n]",
      )
      .returning(Right(()))

    val testMessageBody = MessageBody(
      identityId = "someIdentityId",
      productName = "supporterPlus",
      previousProductName = None,
      eventType = Acquisition,
      subscriptionNumber = "A-S12345678",
    )

    val result = processAcquiredSub(
      testMessageBody,
      mockSendConsentsReq,
      calculator,
    )

    result shouldBe Right(())
  }

  test(testName = "processCancellation should handle supporter plus cancellation while owning an IAP") {
    val mobileSubscriptions = MobileSubscriptions(
      List(
        MobileSubscription(true),
      ),
    )

    mockSendConsentsReq
      .expects(
        "someIdentityId",
        "[\n  {\n    \"id\" : \"digital_subscriber_preview\",\n    \"consented\" : false\n  }\n]",
      )
      .returning(Right(()))
    mockGetMobileSubscriptions.expects("someIdentityId").returning(Right(mobileSubscriptions))
    mockSfConnector.getActiveSubs _ expects Seq("someIdentityId") returning Right(
      SFAssociatedSubResponse(
        0,
        true,
        records = Seq(),
      ),
    )

    val testMessageBody = MessageBody(
      identityId = "someIdentityId",
      productName = "supporterPlus",
      previousProductName = None,
      eventType = Cancellation,
      subscriptionNumber = "A-S12345678",
    )

    val result = processCancelledSub(
      testMessageBody,
      mockSendConsentsReq,
      mockGetMobileSubscriptions,
      calculator,
      mockSfConnector,
    )

    result shouldBe Right(())
  }

  test(testName = "processCancellation should handle supporter plus cancellation while owning no other products") {
    val mobileSubscriptions = MobileSubscriptions(List())

    mockSendConsentsReq
      .expects(
        "someIdentityId",
        "[\n  {\n    \"id\" : \"your_support_onboarding\",\n    \"consented\" : false\n  },\n  {\n    \"id\" : \"similar_guardian_products\",\n    \"consented\" : false\n  },\n  {\n    \"id\" : \"supporter_newsletter\",\n    \"consented\" : false\n  },\n  {\n    \"id\" : \"digital_subscriber_preview\",\n    \"consented\" : false\n  }\n]",
      )
      .returning(Right(()))
    mockGetMobileSubscriptions.expects("someIdentityId").returning(Right(mobileSubscriptions))
    mockSfConnector.getActiveSubs _ expects Seq("someIdentityId") returning Right(
      SFAssociatedSubResponse(
        0,
        true,
        records = Seq(),
      ),
    )

    val testMessageBody = MessageBody(
      identityId = "someIdentityId",
      productName = "supporterPlus",
      previousProductName = None,
      eventType = Cancellation,
      subscriptionNumber = "A-S12345678",
    )

    val result = processCancelledSub(
      testMessageBody,
      mockSendConsentsReq,
      mockGetMobileSubscriptions,
      calculator,
      mockSfConnector,
    )

    result shouldBe Right(())
  }
}
