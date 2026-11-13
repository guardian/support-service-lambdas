package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.{
  ConsentsMapping,
  SFAssociatedSubResponse,
  SFBuyer,
  SFSubRecord,
  SoftOptInError,
}
import org.scalatest.funsuite.AnyFunSuite
import org.scalatest.matchers.should.Matchers

class ScheduledCancellationTests extends AnyFunSuite with Matchers {
  private val primaryIdentityId = "primary-identity"
  private val subscriptionId = "A-S123"
  private val calculator = new ConsentsCalculator(ConsentsMapping.consentsMapping)
  private val activeSubscriptions = SFAssociatedSubResponse(0, true, Seq.empty)

  private def cancelledSubscription = SFSubRecord(
    Id = "salesforce-record-id",
    Name = subscriptionId,
    Product__c = "Supporter Plus",
    SF_Status__c = "Cancelled",
    Soft_Opt_in_Status__c = Handler.readyToProcessCancellationStatus,
    Buyer__r = SFBuyer(primaryIdentityId),
    Subscription_Rate_Plan_Updates__r = None,
    Soft_Opt_in_Last_Stage_Processed__c = None,
    Soft_Opt_in_Number_of_Attempts__c = Some(0),
  )

  private def process(
      secondaryIdentityIds: Either[SoftOptInError, Set[String]],
      secondarySendResult: String => Either[SoftOptInError, Unit] = _ => Right(()),
  ) = {
    var primaryConsentRequests = Vector.empty[String]
    var secondaryCancellationRequests = Vector.empty[(String, String)]

    val update = Handler.processCancelledSub(
      cancelledSubscription,
      activeSubscriptions,
      (identityId, _) => {
        primaryConsentRequests :+= identityId
        Right(())
      },
      calculator,
      _ => Right(Set.empty),
      _ => secondaryIdentityIds,
      (identityId, subscriptionId) => {
        secondaryCancellationRequests :+= identityId -> subscriptionId
        secondarySendResult(identityId)
      },
    )

    (update, primaryConsentRequests, secondaryCancellationRequests)
  }

  test("processes the primary cancellation when there are no secondary users") {
    val (update, primaryRequests, secondaryRequests) = process(Right(Set.empty))

    update.Soft_Opt_in_Last_Stage_Processed__c shouldBe Some("Cancellation")
    update.Soft_Opt_in_Number_of_Attempts__c shouldBe 0
    primaryRequests shouldBe Vector(primaryIdentityId)
    secondaryRequests shouldBe empty
  }

  test("publishes a cancellation for one secondary user") {
    val (update, primaryRequests, secondaryRequests) = process(Right(Set("secondary-1")))

    update.Soft_Opt_in_Last_Stage_Processed__c shouldBe Some("Cancellation")
    update.Soft_Opt_in_Number_of_Attempts__c shouldBe 0
    primaryRequests shouldBe Vector(primaryIdentityId)
    secondaryRequests shouldBe Vector("secondary-1" -> subscriptionId)
  }

  test("publishes a cancellation for each secondary user") {
    val (update, primaryRequests, secondaryRequests) = process(Right(Set("secondary-2", "secondary-1")))

    update.Soft_Opt_in_Last_Stage_Processed__c shouldBe Some("Cancellation")
    update.Soft_Opt_in_Number_of_Attempts__c shouldBe 0
    primaryRequests shouldBe Vector(primaryIdentityId)
    secondaryRequests shouldBe Vector(
      "secondary-1" -> subscriptionId,
      "secondary-2" -> subscriptionId,
    )
  }

  test("does not update consents when the secondary user lookup fails") {
    val (update, primaryRequests, secondaryRequests) = process(Left(SoftOptInError("lookup failed")))

    update.Soft_Opt_in_Last_Stage_Processed__c shouldBe None
    update.Soft_Opt_in_Number_of_Attempts__c shouldBe 1
    primaryRequests shouldBe empty
    secondaryRequests shouldBe empty
  }

  test("attempts every secondary user and marks the cancellation for retry when a message fails") {
    val (update, primaryRequests, secondaryRequests) = process(
      Right(Set("secondary-1", "secondary-2", "secondary-3")),
      identityId =>
        if (identityId == "secondary-2") Left(SoftOptInError("queue failed"))
        else Right(()),
    )

    update.Soft_Opt_in_Last_Stage_Processed__c shouldBe None
    update.Soft_Opt_in_Number_of_Attempts__c shouldBe 1
    primaryRequests shouldBe Vector(primaryIdentityId)
    secondaryRequests shouldBe Vector(
      "secondary-1" -> subscriptionId,
      "secondary-2" -> subscriptionId,
      "secondary-3" -> subscriptionId,
    )
  }
}
