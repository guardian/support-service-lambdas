package com.gu.soft_opt_in_consent_setter

import IAPMessageProcessor._
import com.gu.soft_opt_in_consent_setter.HandlerIAP._
import com.gu.soft_opt_in_consent_setter.models.{
  ConsentsMapping,
  SFAssociatedSubRecord,
  SFAssociatedSubResponse,
  SoftOptInError,
}
import com.gu.soft_opt_in_consent_setter.{
  ConsentsCalculator,
  IAPMessageProcessor,
  MobileSubscription,
  MobileSubscriptions,
  SalesforceConnector,
}
import org.scalamock.scalatest.MockFactory
import org.scalatest.funsuite.AnyFunSuite
import org.scalatest.matchers.should.Matchers

// higher level tests on the 'processProductSwitch', 'processAcquisition' and 'processCancellation' functions.

class HandlerTests extends AnyFunSuite with Matchers with MockFactory {

  val calculator = new ConsentsCalculator(ConsentsMapping.consentsMapping)
  val mockSendConsentsReq = mockFunction[String, String, Either[SoftOptInError, Unit]]
  val mockGetMobileSubscriptions = mockFunction[String, Either[SoftOptInError, MobileSubscriptions]]
  val mockSfConnector = mock[SalesforceConnector]

  val identityId = "someIdentityId"
  val subscriptionId = "A-S12345678"

  test(testName = "processProductSwitchSub should handle product switch event correctly") {
    val mobileSubscriptions = MobileSubscriptions(
      List(
        MobileSubscription(true, "InAppPurchase"),
      ),
    )

    mockSendConsentsReq
      .expects(
        identityId,
        """[
          |]""".stripMargin,
      )
      .returning(Right(()))
    mockGetMobileSubscriptions.expects("someIdentityId").returning(Right(mobileSubscriptions))
    mockSfConnector.getActiveSubs _ expects Seq("someIdentityId") returning Right(
      SFAssociatedSubResponse(
        1,
        true,
        records = Seq(
          SFAssociatedSubRecord(
            "Contributor",
            identityId,
          ),
        ),
      ),
    )

    val testMessageBody = MessageBody(
      identityId = "someIdentityId",
      productName = "Supporter Plus",
      printProduct = None,
      previousProductName = Some("Contributor"),
      eventType = Switch,
      subscriptionId = "A-S12345678",
      userConsentsOverrides = None,
    )

    val result = IAPMessageProcessor.processProductSwitchSub(
      testMessageBody,
      mockSendConsentsReq,
      mockGetMobileSubscriptions,
      calculator,
      mockSfConnector,
    )

    result shouldBe Right(())
  }

  test(testName = "processAcquiredSub should handle acquisition event correctly") {
    mockSendConsentsReq
      .expects(
        "someIdentityId",
        """[
          |  {
          |    "id" : "your_support_onboarding",
          |    "consented" : true
          |  },
          |  {
          |    "id" : "similar_guardian_products",
          |    "consented" : true
          |  },
          |  {
          |    "id" : "supporter_newsletter",
          |    "consented" : true
          |  }
          |]""".stripMargin,
      )
      .returning(Right(()))

    val testMessageBody = MessageBody(
      identityId = "someIdentityId",
      productName = "Supporter Plus",
      printProduct = None,
      previousProductName = None,
      eventType = Acquisition,
      subscriptionId = "A-S12345678",
      userConsentsOverrides = None,
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
        MobileSubscription(true, "InAppPurchase"),
      ),
    )

    mockSendConsentsReq
      .expects(
        "someIdentityId",
        """[
          |]""".stripMargin,
      )
      .never()
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
      productName = "Supporter Plus",
      printProduct = None,
      previousProductName = None,
      eventType = Cancellation,
      subscriptionId = "A-S12345678",
      userConsentsOverrides = None,
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
        """[
          |  {
          |    "id" : "your_support_onboarding",
          |    "consented" : false
          |  },
          |  {
          |    "id" : "supporter_newsletter",
          |    "consented" : false
          |  }
          |]""".stripMargin,
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
      productName = "Supporter Plus",
      printProduct = None,
      previousProductName = None,
      eventType = Cancellation,
      subscriptionId = "A-S12345678",
      userConsentsOverrides = None,
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

  test(testName =
    "when cancelling Supporter Plus, while also holding a Feast IAP, processCancellation should unset the Supporter Plus consents which are not shared with the Feast IAP",
  ) {
    val mobileSubscriptionsIncludingFeast = MobileSubscriptions(
      List(
        MobileSubscription(true, "FeastInAppPurchase"),
      ),
    )

    mockSendConsentsReq
      .expects(
        "someIdentityId",
        """[
          |  {
          |    "id" : "supporter_newsletter",
          |    "consented" : false
          |  }
          |]""".stripMargin,
      )
      .returning(Right(()))
    mockGetMobileSubscriptions.expects("someIdentityId").returning(Right(mobileSubscriptionsIncludingFeast))
    mockSfConnector.getActiveSubs _ expects Seq("someIdentityId") returning Right(
      SFAssociatedSubResponse(
        0,
        true,
        records = Seq(),
      ),
    )

    val testMessageBody = MessageBody(
      identityId = "someIdentityId",
      productName = "Supporter Plus",
      printProduct = None,
      previousProductName = None,
      eventType = Cancellation,
      subscriptionId = "A-S12345678",
      userConsentsOverrides = None,
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
  test(testName = "processAcquiredSub should handle a Tier Three acquisition event correctly") {
    mockSendConsentsReq
      .expects(
        "someIdentityId",
        """[
          |  {
          |    "id" : "your_support_onboarding",
          |    "consented" : true
          |  },
          |  {
          |    "id" : "similar_guardian_products",
          |    "consented" : true
          |  },
          |  {
          |    "id" : "supporter_newsletter",
          |    "consented" : true
          |  },
          |  {
          |    "id" : "guardian_weekly_newsletter",
          |    "consented" : true
          |  }
          |]""".stripMargin,
      )
      .returning(Right(()))

    val testMessageBody = MessageBody(
      identityId = "someIdentityId",
      productName = "Tier Three",
      printProduct = None,
      previousProductName = None,
      eventType = Acquisition,
      subscriptionId = "A-S12345678",
      userConsentsOverrides = None,
    )

    val result = processAcquiredSub(
      testMessageBody,
      mockSendConsentsReq,
      calculator,
    )

    result shouldBe Right(())
  }

  test(testName = "processAcquiredSub should set `similar guardian products` consent to false when specified") {
    mockSendConsentsReq
      .expects(
        "someIdentityId",
        """[
          |  {
          |    "id" : "your_support_onboarding",
          |    "consented" : true
          |  },
          |  {
          |    "id" : "similar_guardian_products",
          |    "consented" : false
          |  },
          |  {
          |    "id" : "supporter_newsletter",
          |    "consented" : true
          |  },
          |  {
          |    "id" : "guardian_weekly_newsletter",
          |    "consented" : true
          |  }
          |]""".stripMargin,
      )
      .returning(Right(()))

    val testMessageBody = MessageBody(
      identityId = "someIdentityId",
      productName = "Tier Three",
      printProduct = None,
      previousProductName = None,
      eventType = Acquisition,
      subscriptionId = "A-S12345678",
      userConsentsOverrides = Some(UserConsentsOverrides(similarGuardianProducts = Some(false))),
    )

    val result = processAcquiredSub(
      testMessageBody,
      mockSendConsentsReq,
      calculator,
    )

    result shouldBe Right(())
  }

  test(testName = "processAcquiredSub should set `similar guardian products` consent to true when specified") {
    mockSendConsentsReq
      .expects(
        "someIdentityId",
        """[
          |  {
          |    "id" : "your_support_onboarding",
          |    "consented" : true
          |  },
          |  {
          |    "id" : "similar_guardian_products",
          |    "consented" : true
          |  },
          |  {
          |    "id" : "supporter_newsletter",
          |    "consented" : true
          |  },
          |  {
          |    "id" : "guardian_weekly_newsletter",
          |    "consented" : true
          |  }
          |]""".stripMargin,
      )
      .returning(Right(()))

    val testMessageBody = MessageBody(
      identityId = "someIdentityId",
      productName = "Tier Three",
      printProduct = None,
      previousProductName = None,
      eventType = Acquisition,
      subscriptionId = "A-S12345678",
      userConsentsOverrides = Some(UserConsentsOverrides(similarGuardianProducts = Some(true))),
    )

    val result = processAcquiredSub(
      testMessageBody,
      mockSendConsentsReq,
      calculator,
    )

    result shouldBe Right(())
  }
}
