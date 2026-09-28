package com.gu.soft_opt_in_consent_setter

import IAPMessageProcessor._
import com.gu.soft_opt_in_consent_setter.HandlerIAP._
import com.gu.soft_opt_in_consent_setter.models.{
  ConsentsMapping,
  SFAssociatedSubRecord,
  SFAssociatedSubResponse,
  SFBuyer,
  SFSubRecord,
  SoftOptInError,
}
import com.gu.soft_opt_in_consent_setter.{
  ConsentsCalculator,
  IAPMessageProcessor,
  MobileSubscription,
  MobileSubscriptions,
  SalesforceConnector,
}
import io.circe.Json
import io.circe.parser.parse
import org.scalamock.scalatest.MockFactory
import org.scalatest.funsuite.AnyFunSuite
import org.scalatest.matchers.should.Matchers

import scala.collection.mutable.ListBuffer

// higher level tests on the 'processProductSwitch', 'processAcquisition' and 'processCancellation' functions.

class HandlerTests extends AnyFunSuite with Matchers with MockFactory {

  val calculator = new ConsentsCalculator(ConsentsMapping.consentsMapping)
  val mockSendConsentsReq = mockFunction[String, String, Either[SoftOptInError, Unit]]
  val mockGetMobileSubscriptions = mockFunction[String, Either[SoftOptInError, MobileSubscriptions]]
  val mockSfConnector = mock[SalesforceConnector]

  val identityId = "someIdentityId"
  val subscriptionId = "A-S12345678"

  test(testName = "secondary user access is treated as an active product for cancellation") {
    Handler.productsForCancellation(Set("Membership"), hasActiveSecondaryUserAccess = true) shouldBe
      Set("Membership", "Secondary User")
  }

  test(testName = "cancellation products remain unchanged without secondary user access") {
    Handler.productsForCancellation(Set("Membership"), hasActiveSecondaryUserAccess = false) shouldBe Set("Membership")
  }

  test(testName = "scheduled cancellations preserve consents only for active secondary users") {
    val secondaryIdentityId = "secondaryIdentityId"
    val failedIdentityId = "failedIdentityId"
    val otherIdentityId = "otherIdentityId"
    val cancelledSubs = Seq(secondaryIdentityId, failedIdentityId, otherIdentityId).map { id =>
      SFSubRecord(
        Id = s"sub-$id",
        Name = s"A-$id",
        Product__c = "Supporter Plus",
        SF_Status__c = "Cancelled",
        Soft_Opt_in_Status__c = Handler.readyToProcessCancellationStatus,
        Buyer__r = SFBuyer(id),
        Subscription_Rate_Plan_Updates__r = None,
        Soft_Opt_in_Number_of_Attempts__c = Some(if (id == failedIdentityId) 3 else 0),
      )
    }
    val sentRequests = ListBuffer.empty[(String, String)]
    val updatePayloads = ListBuffer.empty[String]
    val metrics = ListBuffer.empty[(String, Int)]
    val secondaryUserAccessByIdentityId: Map[String, Either[SoftOptInError, Boolean]] = Map(
      secondaryIdentityId -> Right(true),
      failedIdentityId -> Left(SoftOptInError("SupporterProductData lookup failed for failedIdentityId")),
      otherIdentityId -> Right(false),
    )

    val result = Handler.processCancelledSubs(
      cancelledSubs,
      SFAssociatedSubResponse(0, true, Seq.empty),
      (id, body) => {
        sentRequests += (id -> body)
        Right(())
      },
      body => {
        updatePayloads += body
        Right(())
      },
      calculator,
      secondaryUserAccessByIdentityId,
      (event, value) => {
        metrics += (event -> value)
        ()
      },
    )

    result shouldBe Right(())
    sentRequests.map(_._1).toList shouldBe List(otherIdentityId)
    val unsetConsents = parse(sentRequests.head._2).toOption.get.asArray.get.map { consent =>
      consent.hcursor.get[String]("id").toOption.get -> consent.hcursor.get[Boolean]("consented").toOption.get
    }.toSet
    unsetConsents shouldBe Set("your_support_onboarding" -> false, "supporter_newsletter" -> false)
    updatePayloads.size shouldBe 1
    val updateJson = parse(updatePayloads.head).toOption.get
    val updates = updateJson.hcursor.get[Vector[Json]]("records").toOption.get
    updates.map(_.hcursor.get[String]("Id").toOption.get) shouldBe
      Vector(s"sub-$secondaryIdentityId", s"sub-$failedIdentityId", s"sub-$otherIdentityId")
    updates.map(_.hcursor.get[Int]("Soft_Opt_in_Number_of_Attempts__c").toOption.get) shouldBe Vector(0, 4, 0)
    updates.map(_.hcursor.get[Option[String]]("Soft_Opt_in_Last_Stage_Processed__c").toOption.get) shouldBe
      Vector(Some("Cancellation"), None, Some("Cancellation"))
    metrics.toList shouldBe List(
      "cancellations_to_process" -> 3,
      "successful_consents_updates" -> 2,
      "failed_consents_updates" -> 1,
    )
  }

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
      _ => Right(false),
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
      _ => Right(false),
    )

    result shouldBe Right(())
  }

  test(testName = "processCancellation preserves consents while the user has active secondary access") {
    mockSendConsentsReq.expects(*, *).never()
    mockGetMobileSubscriptions.expects(identityId).returning(Right(MobileSubscriptions(List.empty)))
    mockSfConnector.getActiveSubs _ expects Seq(identityId) returning Right(
      SFAssociatedSubResponse(0, true, records = Seq.empty),
    )

    val testMessageBody = MessageBody(
      identityId = identityId,
      productName = "Supporter Plus",
      printProduct = None,
      previousProductName = None,
      eventType = Cancellation,
      subscriptionId = subscriptionId,
      userConsentsOverrides = None,
    )

    val result = processCancelledSub(
      testMessageBody,
      mockSendConsentsReq,
      mockGetMobileSubscriptions,
      calculator,
      mockSfConnector,
      _ => Right(true),
    )

    result shouldBe Right(())
  }

  test(testName = "processCancellation does not change consents when secondary access cannot be checked") {
    val lookupError = SoftOptInError("SupporterProductData query failed", null)
    mockSendConsentsReq.expects(*, *).never()
    mockGetMobileSubscriptions.expects(identityId).returning(Right(MobileSubscriptions(List.empty)))
    mockSfConnector.getActiveSubs _ expects Seq(identityId) returning Right(
      SFAssociatedSubResponse(0, true, records = Seq.empty),
    )

    val testMessageBody = MessageBody(
      identityId = identityId,
      productName = "Supporter Plus",
      printProduct = None,
      previousProductName = None,
      eventType = Cancellation,
      subscriptionId = subscriptionId,
      userConsentsOverrides = None,
    )

    val result = processCancelledSub(
      testMessageBody,
      mockSendConsentsReq,
      mockGetMobileSubscriptions,
      calculator,
      mockSfConnector,
      _ => Left(lookupError),
    )

    result shouldBe Left(lookupError)
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
      _ => Right(false),
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
