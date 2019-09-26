package com.gu.salesforce.holiday_stops

import java.time.LocalDate

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.holiday_stops.subscription.CreditCalculator.PartiallyWiredCreditCalculator
import com.gu.holiday_stops.Fixtures
import com.gu.holiday_stops.subscription.Subscription
import com.gu.salesforce.SalesforceAuthenticate.SFAuthConfig
import com.gu.salesforce.SalesforceClient
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest._
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail._
import com.gu.salesforce.holiday_stops.SalesforceSFSubscription.SubscriptionForSubscriptionNameAndContact.IdentityId
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.resthttp.JsonHttp
import org.scalatest.{FlatSpec, Matchers}
import scalaz.{-\/, \/-}

class SalesforceHolidayStopRequestEndToEndEffectsTest extends FlatSpec with Matchers {

  case class EndToEndResults(
    createResult: HolidayStopRequestId,
    preProcessingFetchResult: List[SalesforceHolidayStopRequest.HolidayStopRequest],
    postProcessingFetchResult: List[SalesforceHolidayStopRequest.HolidayStopRequest],
    deleteResult: String
  )

  it should "Salesforce Holiday Stop Requests should work end to end" taggedAs EffectsTest in {

    val startDate = LocalDate.now().plusDays(10)
    val endDate = LocalDate.now().plusDays(15)
    val lookupDate = LocalDate.now().plusDays(12)
    val productName = ProductName("Guardian Weekly")

    val actual = for {
      sfConfig <- LoadConfigModule(Stage("DEV"), GetFromS3.fetchString)[SFAuthConfig]
      response = RawEffects.response
      sfAuth <- SalesforceClient(response, sfConfig).value.toDisjunction

      verifySubOwnerOp = SalesforceSFSubscription.SubscriptionForSubscriptionNameAndContact(sfAuth.wrapWith(JsonHttp.getWithParams))
      maybeMatchingSubscription <- verifySubOwnerOp(
        SubscriptionName("A-S00050817"), // must exist in DEV Scalculate the first available date basedalesForce
        Left(IdentityId("100004814"))
      ).toDisjunction

      fakePartiallyWiredCreditCalculator: PartiallyWiredCreditCalculator = (_, _) => Right(0.0)
      fakeSubscription: Subscription = Fixtures.mkSubscription()

      createOp = SalesforceHolidayStopRequest.CreateHolidayStopRequestWithDetail(sfAuth.wrapWith(JsonHttp.post))
      createResult <- createOp(CreateHolidayStopRequestWithDetail.buildBody(
        fakePartiallyWiredCreditCalculator
      )(
        startDate,
        endDate,
        maybeMatchingSubscription.get,
        fakeSubscription
      )).toDisjunction

      fetchOp = SalesforceHolidayStopRequest.LookupByDateAndProductNamePrefix(sfAuth.wrapWith(JsonHttp.getWithParams))
      preProcessingFetchResult <- fetchOp(lookupDate, productName).toDisjunction

      id: HolidayStopRequestsDetailId = preProcessingFetchResult.find(_.Id == createResult).get
        .Holiday_Stop_Request_Detail__r.get.records
        .head.Id
      processOp = SalesforceHolidayStopRequestsDetail.ActionSalesforceHolidayStopRequestsDetail(
        sfAuth.wrapWith(JsonHttp.patch)
      )(id)
      _ <- processOp(HolidayStopRequestsDetailActioned(
        HolidayStopRequestsDetailChargeCode("C-1234567"),
        HolidayStopRequestsDetailChargePrice(-12.34)
      )).toDisjunction

      postProcessingFetchResult <- fetchOp(lookupDate, productName).toDisjunction

      // UN-ACTION in order to delete the parent
      _ <- processOp(HolidayStopRequestsDetailActioned(
        HolidayStopRequestsDetailChargeCode(""),
        HolidayStopRequestsDetailChargePrice(0)
      )).toDisjunction

      deleteOp = SalesforceHolidayStopRequest.DeleteHolidayStopRequest(sfAuth.wrapWith(JsonHttp.deleteWithStringResponse))
      deleteResult <- deleteOp(createResult).toDisjunction

    } yield EndToEndResults(createResult, preProcessingFetchResult, postProcessingFetchResult, deleteResult)

    actual match {

      case -\/(failure) => fail(failure.toString)

      case \/-(EndToEndResults(createResult, preProcessingFetchResult, postProcessingFetchResult, _)) =>

        withClue("should be able to find the freshly created Holiday Stop Request and its Actioned Count should be ZERO") {
          preProcessingFetchResult
            .find(_.Id == createResult)
            .filter(_.Actioned_Count__c.value == 0) should not be None
        }

        withClue("after processing the Actioned Count of Holiday Stop Request should have increased to ONE ") {
          postProcessingFetchResult
            .find(_.Id == createResult)
            .filter(_.Actioned_Count__c.value == 1) should not be None
        }
    }

  }

}
